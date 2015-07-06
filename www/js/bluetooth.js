// ----------------------------------------------------------------------------------------------------------------
// Bluetooth (BLE 4.0) using Phonegap Bluetooth LE library
// Author: Jodaryle Factor
// Date: July 4, 2015
// ----------------------------------------------------------------------------------------------------------------

function bluetooth(jqm_listview)
{
    // ----------------------------------------------------------------------------------------------------------------
    // Use nRF Master Control Panel (BLE) Android app
    // to get Service and Characteristic UUID
    // ----------------------------------------------------------------------------------------------------------------
    var BLE = {
        SERVICE_UUID: 'ffe0',
        CHARACTERISTIC_UUID: 'ffe1'
    };

    var _self = this;

    this.deviceType = '';
    this.listviewObj = jqm_listview;
    this.isScanning = false;
    this.isInitialized = false;

    this.bluetoothDevices = [];
    this.deviceObject = null;

    this.writeResult = {};
    this.readResult = {};

    // ----------------------------------------------------------------------------------------------------------------
    // Helper Functions
    // ----------------------------------------------------------------------------------------------------------------

    this.postMessage = function (msg) {
        navigator.notification.alert(msg, null, 'Notification');
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Bluetooth Initialization
    // ----------------------------------------------------------------------------------------------------------------

    this.init = function (deviceType) {
        _self.deviceType = deviceType;

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
        _self.bluetoothDevices.length = 0;    // clear array
        _self.listviewObj.empty();
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Scanning
    // ----------------------------------------------------------------------------------------------------------------

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
            // find device object
            var dev = $.grep(_self.bluetoothDevices, function (e) {
                return e.address == result.address;
            });

            if (dev.length > 0)      // disregard if device already exist
                return;

            var itemContent = '<h1>' + result.name + '</h1>' +
                              'RSSI: <span style=\'color:#aa0000\'>' + result.rssi + '</span><br>' +
                              'ADDRESS: <span style=\'color:#aa0000\'>' + result.address + '</span><br>';

            var itemObject = $('<li class=\'wrap\'>' + itemContent + '</li><br>');

            // append <li> element to <ul> listview
            _self.listviewObj.append(itemObject);

            // create object
            var device = {
                address: result.address,
                name: result.name,
                rssi: result.rssi,
                itemObject: itemObject,
                statusObject: null, 
                isConnected: false,
                isDiscovered: false
            };

            // add to device array
            _self.bluetoothDevices.push(device);

            itemObject.unbind('click');
            itemObject.click(function () {
                _self.selectBluetoothDevice(_self.bluetoothDevices.length-1);
            });

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

    // ----------------------------------------------------------------------------------------------------------------
    // Connect
    // ----------------------------------------------------------------------------------------------------------------

    this.selectBluetoothDevice = function (deviceIndex) {
        // get the device object
        _self.deviceObject = _self.bluetoothDevices[deviceIndex];

        navigator.notification.confirm('Connect to ' + _self.deviceObject.name + '?',
            function (result) {
                if (result == 1) {
                    var statusObject = $('<span></span>');
                    _self.deviceObject.statusObject = statusObject;
                    _self.connectToBluetoothDevice();
                }
            },
            'BLE Connect',
            'Connect,Cancel');
    }

    this.connectToBluetoothDevice = function () {
        var param = { address: _self.deviceObject.address };
        bluetoothle.connect(_self.connectSuccess, _self.connectError, param);
    }

    this.connectSuccess = function (result) {
        switch (result.status) {
            case 'connected':
                _self.deviceObject.isConnected = true;
                _self.deviceObject.statusObject.html('Discovering Services ...');
                _self.discoverServices();
                break;

            case 'connecting':
                _self.deviceObject.itemObject.css('background-color', '#ffffaa');
                _self.deviceObject.statusObject.html('Connecting ...');
                break;

            case 'disconnected':
                _self.deviceObject.itemObject.css('background-color', '#ff5555');
                _self.deviceObject.isConnected = false;
                _self.deviceObject.isDiscovered = false;
                break;
        }
    }

    this.connectError = function (result) {
        _self.postMessage("Connect Error : " + JSON.stringify(result));
    }

    this.discoverServices = function () {
        var params = { address: _self.deviceObject.address };
        bluetoothle.discover(_self.discoverServicesSuccess, _self.discoverServicesError, params);
    }

    this.discoverServicesSuccess = function (result) {
        _self.deviceObject.isDiscovered = true;
        _self.deviceObject.statusObject.html('Connected');
        _self.deviceObject.itemObject.css('background-color', '#99ff99');

        // Test Transmit
        _self.sendToDevice('CMD+RTT');
    }

    this.discoverServicesError = function (result) {
        _self.postMessage("discoverError: " + JSON.stringify(result));
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Disconnect
    // ----------------------------------------------------------------------------------------------------------------

    this.disconnectDevice = function () {
        var params = { address: _self.deviceObject.address };
        bluetoothle.disconnect(_self.disconnectSuccess, _self.disconnectError, params);
    }

    this.disconnectSuccess = function (result) {
        switch (result.status) {
            case 'disconnected':
                _self.deviceObject.isConnected = false;
                _self.deviceObject.isDiscovered = false;
                var params = { address: _self.deviceObject.address };
                bluetoothle.close(_self.closeSuccess, _self.closeError, params);
                break;

            case 'disconnecting':
                break;
        }
    }

    this.disconnectError = function (result) {
        _self.postMessage("disconnectError: " + JSON.stringify(result));
    }

    this.closeSuccess = function (result) {
        _self.postMessage("closeSuccess: " + JSON.stringify(result));
    }

    this.closeError = function (result) {
        _self.postMessage("closeError: " + JSON.stringify(result));
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Sending 
    // ----------------------------------------------------------------------------------------------------------------

    this.sendToDevice = function (stringMessage) {
        try
        {
            var params = {
                address: _self.deviceObject.address,
                value: bluetoothle.bytesToEncodedString(bluetoothle.stringToBytes(stringMessage + '\r\n')),
                serviceUuid: 'ffe0',
                characteristicUuid: 'ffe1'
            };

            /*
            _self.writeResult = {
                error: 0,
                status: 'sending', 
                value: ''
            };
            */

            bluetoothle.write(_self.sendSuccess, _self.sendError, params);
        }
        catch (e) {
            _self.postMessage('sendToDevice Err: ' + e);
        }
    }

    this.sendSuccess = function (result) {
        //_self.writeResult.error = 0;
        //_self.writeResult.status = result.status;
        _self.postMessage('sendSuccess: ' + JSON.stringify(result));
    }

    this.sendError = function (result) {
        //_self.writeResult.error = 1;
        //_self.writeResult.status = result.status;
        _self.postMessage('sendError: ' + JSON.stringify(result));
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Receiving 
    // ----------------------------------------------------------------------------------------------------------------

    this.receiveFromDevice = function () {
        var params = {
            address: _self.deviceObject.address,
            serviceUuid: BLE.GENERIC_ACCESS,
            characteristicUuid: BLE.GENERIC_ACCESS_CHARACTERISTIC_RXTX
        };

        _self.readResult = {
            error: 0,
            status: 'receiving',
            value: ''
        };

        bluetoothle.read(_self.receiveSuccess, _self.receiveError, params);
        while (_self.readResult.status == 'receiving');
        return _self.readResult.error == 0 && _self.readResult.status == 'read';
    }

    this.receiveSuccess = function (result) {
        _self.readResult.error = 0;
        _self.readResult.value = result.value;
        _self.readResult.status = result.status;
    }

    this.receiveError = function (result) {
        _self.readResult.error = 1;
        _self.readResult.value = '';
        _self.readResult.status = result.status;
    }
}
