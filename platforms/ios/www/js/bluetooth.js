function bluetooth(jqm_listview) 
{
    var _self = this;
    this.listviewObj = jqm_listview;
    this.isScanning = false;
    this.isInitialized = false;

    this.postMessage = function (msg) {
        alert(msg);
    }

    this.init = function () {
        var paramsObj = { request: true };
        bluetoothle.initialize(_self.initializeSuccess, _self.initializeError, params);
    }

    this.initializeSuccess = function (result) {
        _self.postMessage("Initialize Success : " + JSON.stringify(result));
    }

    this.initializeError = function (result) {
        _self.postMessage("Initialize Error : " + JSON.stringify(result));
    }

    this.scan = function () {
        try {
            if (_self.isScanning)
                _self.stopScan();

            var paramsObj = { serviceUuids: [] };

            _self.listviewObj.empty();
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
            setTimeout (function () {
                _self.stopScan();
            }, 30000);  // if scanning, stop after 30 seconds
        }

        if (result.status = 'scanResult')
        {
            /*
            "status": "scanResult",
            "advertisement": "awArG05L",
            "rssi": -58,
            "name": "Polar H7 3B321015",
            "address": "ECC037FD-72AE-AFC5-9213-CA785B3B5C63"
            */

            var itemContent = '<h1>' + result.name + '</h1>' + '<span style="color:#aa0000">(' + result.advertisement + ')</span>' +
                              'rssi: ' + result.rssi + ' ' +
                              'address: ' + result.address;

            var itemHandler = 'alert("' + result.name + '");';
            var itemToAdd = '<li onclick=' + itemHandler + '>' + itemContent + '</li>';
            _self.listviewObj.append(itemToAdd);

            _self.listviewObj.listview('refresh');
        }
    }

    this.startScanError = function (error) {
        _self.postMessage('Start Scan Error : ' + JSON.stringify(obj));
    }

    this.stopScan = function () {
        bluetoothle.stopScan(_self.stopScanSuccess, _self.stopScanError);
    }

    this.stopScanSuccess = function () {
        _self.isScanning = true;
    }

    this.stopScanError = function () {
    }
}
