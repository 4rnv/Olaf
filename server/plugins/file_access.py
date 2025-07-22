import os
from .base import Plugin

class FileAccessPlugin(Plugin):
    SANDBOX_DIR = "./sandbox"

    def execute(self, input_str):
        command, _, filename = input_str.partition(':')
        safe_path = os.path.abspath(os.path.join(self.SANDBOX_DIR, filename.strip()))
        if not safe_path.startswith(os.path.abspath(self.SANDBOX_DIR)):
            return "Access denied: Outside sandbox."

        if command == "read":
            try:
                with open(safe_path, "r") as f:
                    return f.read()
            except Exception as e:
                return f"Error reading file: {e}"

        if command == "write":
            return "Write operation not implemented in demo."

        return "Unknown command."
