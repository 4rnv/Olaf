# plugins/base.py
class Plugin:
    def execute(self, input_str):
        raise NotImplementedError("Plugins must implement the execute method.")
