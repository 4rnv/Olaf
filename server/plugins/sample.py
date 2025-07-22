from .base import Plugin

class SamplePlugin(Plugin):
    def execute(self, input_str):
        return f"SamplePlugin processed: {input_str}"
