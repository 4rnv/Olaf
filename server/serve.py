from flask import Flask, request, jsonify
from ddgs import DDGS
from ddgs.exceptions import (
    DDGSException,
    RatelimitException,
    TimeoutException,
)
from flask_cors import cross_origin
from plugins.sample import SamplePlugin
from plugins.file_access import FileAccessPlugin

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

if __name__=='__main__':
    app.run(debug=True)