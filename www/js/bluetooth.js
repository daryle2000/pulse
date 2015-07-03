function bluetooth(jqm_listview) 
{
    var _self = this;
    this.listviewObj = jqm_listview;
    this.isScanning = false;
    this.isInitialized = false;
    this.bluetoothAddresses = [];

    this.postMessage = function (msg) {
        alert(msg);
    }

    this.init = function () {
        var params = { request: true };
        bluetoothle.initialize(_self.initializeSuccess, _self.initializeError, params);
    }

    this.initializeSuccess = function (result) {
        _self.postMessage('BLE 4.0 Initialization Success!!!');
    }

    this.initializeError = function (result) {
        _self.postMessage("Initialize Error : " + JSON.stringify(result));
    }

    this.scan = function () {
        try {
            if (_self.isScanning)
                _self.stopScan();

            _self.bluetoothAddresses.length = 0;    // clear array
            _self.listviewObj.empty();

            var paramsObj = { serviceUuids: [] };
            bluetoothle.startScan(_self.startScanSuccess, _self.startScanError, paramsObj);
        }
        catch (e) {
            _self.postMessage("Exception: " + e);
        }
    }

    this.startScanSuccess = function (result) {
        if (result.status == 'scanStarted')
        {
            _self.isScanning = true;
            setTimeout(function () {
                _self.stopScan();
            }, 15000);  // if scanning, stop after 30 seconds
        }

        if (result.status = 'scanResult' && result.address != undefined)
        {
            /*
            "status": "scanResult",
            "advertisement": "awArG05L",
            "rssi": -58,
            "name": "Polar H7 3B321015",
            "address": "ECC037FD-72AE-AFC5-9213-CA785B3B5C63"
            */

            if (_self.bluetoothAddresses.indexOf(result.address) >= 0)  // disregard if device already exist
                return;

            _self.bluetoothAddresses.push(result.address);  // add bluetooth address

            var itemContent = '<h1>' + result.name + '</h1>' +
                              'advertisement: ' + result.advertisement + '<br>' +
                              'rssi: ' + result.rssi + '<br>' +
                              'address: ' + result.address;

            var itemHandler = 'alert("' + result.name + '");';
            var itemToAdd = '<li class=\'wrap\' + onclick=' + itemHandler + '>' + itemContent + '</li>';
            _self.listviewObj.append(itemToAdd);

            _self.listviewObj.listview('refresh');
        }
    }

    this.startScanError = function (error) {
        _self.postMessage('Start Scan Error : ' + JSON.stringify(error));
    }

    this.stopScan = function () {
        if (_self.isScanning) {
            _self.isScanning = false;
            bluetoothle.stopScan(_self.stopScanSuccess, _self.stopScanError);
        }
    }

    this.stopScanSuccess = function () {
        _self.postMessage('Scanning has stopped!');
    }

    this.stopScanError = function () {
    }
}
