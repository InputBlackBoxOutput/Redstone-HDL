import os, re, json
import pymongo
from bson.json_util import ObjectId

from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin

from dotenv import load_dotenv
if(not load_dotenv()):
	print("Failed to load environment variables!")

from synth import RedstoneSynth
from yosys import Yosys

api = Flask(__name__)
cors = CORS(api)

# Connect with mongoDB
DB_USER = os.environ.get("DB_USER")
DB_PASSWD = os.environ.get("DB_PASSWD")

client = pymongo.MongoClient(f"mongodb+srv://{DB_USER}:{DB_PASSWD}@cluster0.ff8np.mongodb.net/myFirstDatabase?retryWrites=true&w=majority")
db = client['Redstone-HDL']
collection = db['contraption']


# Helper function to create verilog file to process
def create_verilog_file(code):
	code = code[2:-1]
	code = code.split("\\r\\n")
	code = "\n".join(code)

	verilog_file = "code.v"
	# verilog_file = f"{abs(hash(code))}.v"

	with open(verilog_file, 'w') as _file:
		_file.write(code)

	return verilog_file


@api.route('/synthesize', methods=['POST'])
@cross_origin()
def synthesize():
	verilog_file = create_verilog_file(str(request.data))

	try:
		s = RedstoneSynth()
		s.load_file(verilog_file)
		redstone_circuit = {"contraption": s.synthesize()}
		
		response = (redstone_circuit, 200)
	except:
		response = (jsonify({"error": "Something went wrong!"}), 400)
	finally:
		os.remove(verilog_file)

	return response


@api.route('/link', methods=['GET'])
@cross_origin()
def link():
	try:
		if request.args.get("contraption"):
			contraption = request.args.get("contraption")
			redstone_circuit = collection.find_one({"contraption" : contraption})["redstone_circuit"]

			response = (jsonify({"circuit": redstone_circuit}), 200)
		else:
			response = (jsonify({"error": "Contraption name required!"}), 400)

	except pymongo.errors.OperationFailure:
		response = (jsonify({"error": "Failed to connect to database!"}), 400)
	# except:
	# 	response = (jsonify({"error": "Something went wrong!"}), 400)
	
	return response


@api.route('/netlist', methods=['POST'])
@cross_origin()
def netlist():
	verilog_file = create_verilog_file(str(request.data))

	try:
		y = Yosys()
		netlist_json = y.process(verilog_file)	
		response = (jsonify({"output": netlist_json}), 200)
	except:
		response = (jsonify({"error": "Something went wrong!"}), 400)
	finally:
		os.remove(verilog_file)

	return response


@api.route('/',methods=['GET'])
@cross_origin()
def root():
	return jsonify({"success": 1})	

if __name__ == '__main__':
	api.run(
		host="0.0.0.0", 
		port=int(os.environ.get('PORT', 5000)), 
		debug=False
	)
