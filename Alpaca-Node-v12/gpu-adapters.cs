using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

namespace Alpaca {
    public sealed class GpuAdapter {
        public string Name;
        public string CounterKey;
        public uint VendorId;
        public ulong DedicatedBytes;
        public ulong SharedLimitBytes;
    }

    // DXGI supplies 64-bit capacities and the LUID used by Windows GPU counters.
    // Win32_VideoController.AdapterRAM is only 32-bit and cannot map those counters.
    public static class GpuInventory {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        private struct Desc {
            [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 128)] public string Name;
            public uint VendorId, DeviceId, SubSysId, Revision;
            public UIntPtr DedicatedVideoMemory, DedicatedSystemMemory, SharedSystemMemory;
            public uint LuidLow;
            public int LuidHigh;
            public uint Flags;
        }
        [DllImport("dxgi.dll", ExactSpelling = true)]
        private static extern int CreateDXGIFactory1(ref Guid iid, out IntPtr factory);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        private delegate int EnumAdapter(IntPtr self, uint index, out IntPtr adapter);
        [UnmanagedFunctionPointer(CallingConvention.StdCall)]
        private delegate int ReadDesc(IntPtr self, out Desc desc);

        private static Delegate Method(IntPtr instance, int slot, Type type) {
            return Marshal.GetDelegateForFunctionPointer(
                Marshal.ReadIntPtr(Marshal.ReadIntPtr(instance), slot * IntPtr.Size), type);
        }
        public static GpuAdapter[] Read() {
            var result = new List<GpuAdapter>();
            var iid = new Guid("770aae78-f26f-4dba-a829-253c83d1b387");
            IntPtr factory;
            Marshal.ThrowExceptionForHR(CreateDXGIFactory1(ref iid, out factory));
            try {
                var enumerate = (EnumAdapter)Method(factory, 12, typeof(EnumAdapter));
                for (uint i = 0; ; i++) {
                    IntPtr adapter;
                    int hr = enumerate(factory, i, out adapter);
                    if (hr == unchecked((int)0x887A0002)) break; // DXGI_ERROR_NOT_FOUND
                    Marshal.ThrowExceptionForHR(hr);
                    try {
                        Desc desc;
                        Marshal.ThrowExceptionForHR(((ReadDesc)Method(adapter, 10, typeof(ReadDesc)))(adapter, out desc));
                        // Exclude software/remote display drivers; retain AMD, Intel and NVIDIA.
                        if ((desc.Flags & 3) != 0 || (desc.VendorId != 0x1002 && desc.VendorId != 0x8086 && desc.VendorId != 0x10de)) continue;
                        result.Add(new GpuAdapter {
                            Name = desc.Name, VendorId = desc.VendorId,
                            CounterKey = String.Format("luid_0x{0:X8}_0x{1:X8}_phys_0", unchecked((uint)desc.LuidHigh), desc.LuidLow),
                            DedicatedBytes = desc.DedicatedVideoMemory.ToUInt64() + desc.DedicatedSystemMemory.ToUInt64(),
                            SharedLimitBytes = desc.SharedSystemMemory.ToUInt64()
                        });
                    } finally { Marshal.Release(adapter); }
                }
            } finally { Marshal.Release(factory); }
            return result.ToArray();
        }
    }
}
