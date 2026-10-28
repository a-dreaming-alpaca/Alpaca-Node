"""Read the existing AutoConnect portal state without loading saved credentials."""

import importlib.util
import sys


def main() -> None:
    try:
        spec = importlib.util.spec_from_file_location("alpaca_autoconnect", sys.argv[1])
        if spec is None or spec.loader is None:
            raise RuntimeError("AutoConnect module unavailable")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        status = module.state(module.request("/cgi-bin/rad_user_info"))
        print(status if status in ("online", "offline") else "unknown")
    except Exception:
        print("unknown")


if __name__ == "__main__":
    main()
