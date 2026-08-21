import os

import uvicorn
from dashboard.app import create_app

def main() -> None:
    port = int(os.environ.get("SIH_DASHBOARD_PORT", "8765"))
    uvicorn.run(create_app(), host="127.0.0.1", port=port)

if __name__ == "__main__":
    main()
