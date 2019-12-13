var http = require('http');
const path = require('path');
var querystring = require('querystring');
var fs = require('fs');


const Configuration = require('../nodejs-sdk/packages/api/common/configuration').Configuration;
Configuration.setConfig(path.join(__dirname, './conf/BANK.json'));

const { CNSService, PermissionService, Web3jService } = require('../nodejs-sdk/packages/api');
const utils = require('../nodejs-sdk/packages/api/common/utils');
const web3Sync = require('../nodejs-sdk/packages/api/common/web3lib/web3sync');

var api = new Web3jService();
var cns = new CNSService();

var configs = '[{"name":"BANK","privateKey":"0xc8df7b34d39f89a40e473700a766a68bcef51476","configPath":"./config/config.json"},{"name":"C1","privateKey":"0x8dea28808d7733df838e27146eef2ce9752c1f48","configPath":"./config/C1.json"},{"name":"C2","privateKey":"0xc7e5b2bdc62adf1b07bb7cae7f279db93e49d32f","configPath":"./config/C2.json"}, {"name":"C3","privateKey":"0xf2691ab1679ffecaee199f66dbfa1e15c8755d0c","configPath":"./config/C3.json"}]';
configs = JSON.parse(configs);

var ABI;
var contractAddress;

function getItemFromABIByName(name) {
	for (let item of ABI) {
		//console.log(item);
		if (item.name == name) {
			//console.log(item);
			return item;
		}
	}
}

function init() {
	cns.queryCnsByNameAndVersion('Transaction','2.0').then(result => {
		ABI = JSON.parse(result[0].abi);
		contractAddress = result[0].address;
		console.log("ABI:");
		console.log(ABI);
		console.log("contractAddress:");
		console.log(contractAddress);
		console.log("currentConfig:");
		console.log(configs);
	});
}

function switchToAccount (address) {
	for (let item of configs) {
		if (item.privateKey == address) {
			Configuration.reset();
			Configuration.setConfig(path.join(__dirname, item.configPath));
			api.resetConfig();
			cns.resetConfig();
			console.log("switch account to "+item.name);
			return;
		}
	}
}

init();
http.createServer(function (request, response) {
    response.writeHead(200, {'Content-Type': 'text/html'});
	var body = "";
	request.on('data', function (chunk) {
		body += chunk;
	});
	request.on('end', function () {
		// 解析参数
		body = querystring.parse(body);
		if(body.privateKey && body.funcName) {
			switchToAccount(body.privateKey);
			console.log("privateKey:" + body.privateKey);
			console.log("funcName:" + body.funcName);
			console.log("funcParams:" + body.funcParams);

			var params = body.funcParams.split(",");
			if (params[0] == "") {
				params = [];			
			}
			console.log("params:");
			console.log(params);

			var index = body.funcName.indexOf("(");
			var fName = body.funcName.substring(0,index);
			var abi = getItemFromABIByName(fName);
			console.log("func:");
			console.log(abi);

			api.sendRawTransaction(contractAddress, body.funcName, params).then(result => {
				console.log(result);
				let status = result.status;
				let ret = {
					status: status
				};
				let output = result.output;
				if (output !== '0x') {
					ret.output = utils.decodeMethod(getItemFromABIByName(fName), output);
				}
				console.log(ret);
				var retString = JSON.stringify(ret);
				response.write('<script>alert(\'');
				response.write(retString);
				response.write('\')</script>');
				let data = fs.readFileSync('./index.html','utf-8');
				response.write(data);
				response.end();
			});
		}
		else {
			let data = fs.readFileSync('./index.html','utf-8');
			response.write(data);
			response.end();
		}
	});
}).listen(8888);

console.log('Server running at http://127.0.0.1:8080/');

