from flask import Flask, request, Response, jsonify
from ddgs import DDGS
from ddgs.exceptions import (
    DDGSException,
    RatelimitException,
    TimeoutException,
)
from flask_cors import cross_origin
import edge_tts
from plugins.sample import SamplePlugin
from plugins.file_access import FileAccessPlugin
import asyncio

app = Flask(__name__)
PLUGINS = {
    "sample": SamplePlugin(),
    "file_access": FileAccessPlugin(),
}

@app.route('/api/plugin', methods=['POST'])
@cross_origin()
def plugin():
    data = request.get_json()
    plugin_name = data.get('plugin')
    input_str = data.get('input', '')
    plugin = PLUGINS.get(plugin_name)
    if not plugin:
        return jsonify({'error': 'Invalid Request'}), 400
    result = plugin.execute(input_str)
    return jsonify({'result': result})

@app.route('/api/search', methods=['GET'])
@cross_origin()
def search():
    query = request.args.get('q','')
    if not query:
        return jsonify({'error': 'No query provided'}), 400
    try:
        results = DDGS().text(query=query, num_results=8, safesearch="off", region="wt-wt", timelimit="2y")
        print(results)
    except (DDGSException, RatelimitException, TimeoutException) as e:
        print(e)
    return jsonify({'results': results})

async def _to_sync(agen):
    async for chunk in agen:
        yield chunk

@app.route('/api/tts', methods=["GET", "POST"])
@cross_origin()
def tts():
    VOICE = 'en-GB-LibbyNeural'
    query = request.args.get("q", "")
    if not query:
        return jsonify({"error": "No query provided"}), 400

    async def tts_generator():
        communicate = edge_tts.Communicate(query, VOICE)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                yield chunk["data"]

    def sync_generator():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        agen = tts_generator()

        try:
            while True:
                chunk = loop.run_until_complete(agen.__anext__())
                yield chunk
        except StopAsyncIteration:
            pass
        finally:
            loop.close()

    return Response(sync_generator(), mimetype="audio/mpeg")

if __name__=='__main__':
    app.run(debug=True)