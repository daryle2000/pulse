function bluetooth(jqm_listview) 
{
    var _self = this;
    this.listviewObj = jqm_listview;
    this.isScanning = false;
    this.isInitialized = false;
    this.bluetoothAddresses = [];
    this.bluetoothSelectedDeviceAddress = '';

    this.postMessage = function (msg) {
        alert(msg);
    }

    this.init = function () {
        var params = { request: true };
        bluetoothle.initialize(_self.initializeSuccess, _self.initializeError, params);
    }

    this.initializeSuccess = function (result) {
        _self.isInitialized = true;
    }

    this.initializeError = function (result) {
        _self.isInitialized = false;
        _self.postMessage("Initialize Error : " + JSON.stringify(result));
    }

    this.clearDeviceList = function () {
        _self.bluetoothAddresses.length = 0;    // clear array
        _self.listviewObj.empty();
    }

    this.setSelectedDevice = function (deviceAddress) {
        _self.bluetoothSelectedDeviceAddress = deviceAddress;
    }

    this.getSelectedDevice = function () {
        return _self.bluetoothSelectedDeviceAddress;
    }

    this.scan = function () {
        try {
            if (_self.isScanning)
                _self.stopScan();

            _self.clearDeviceList();

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

            if (_self.bluetoothAddresses.indexOf(result.address) >= 0)      // disregard if device already exist
                return;

            var index = _self.bluetoothAddresses.push(result.address) - 1;  // add bluetooth address
            var deviceId = 'device_' + index.toString();

            var itemContent = '<h1>' + result.name + '</h1>' +
                              'RSSI: <span style=\'color:#aa0000\'>' + result.rssi + '</span><br>' +
                              'ADDRESS: <span style=\'color:#aa0000\'>' + result.address + '</span>';

            var itemToAdd = '<li id=' + deviceId + ' class=\'wrap\'>' + itemContent + '</li>';

            var deviceItem = _self.listviewObj.append(itemToAdd);
            deviceItem.unbind('click');
            deviceItem.click(function () {
                _self.selectBluetoothDevice(index);
            });

            _self.listviewObj.listview('refresh');
        }
    }

    this.selectBluetoothDevice = function (index) {
        _self.setSelectedDevice = _self.bluetoothAddresses[index];
        _self.postMessage('Selected device is ' + _self.setSelectedDevice);
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
