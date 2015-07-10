// ----------------------------------------------------------------------------------------------------------------
// Bluetooth (BLE 4.0) using Phonegap Bluetooth LE library
// Author: Jodaryle Factor
// Date: July 4, 2015
// ----------------------------------------------------------------------------------------------------------------

var BLE = {
    SERVICE_UUID: 'ffe0',
    CHARACTERISTIC_UUID: 'ffe1',
    STATUS_ERROR: -1,
    STATUS_NOERROR: 0,
    STATUS_NONE: 0,
    STATUS_SENDING: 2,
    STATUS_SENT: 2,
    STATUS_RECEIVING: 3,
    STATUS_RECEIVED: 4,
    STATUS_SUBSCRIBING: 5,
    STATUS_SUBSCRIBED: 6
};

function bluetooth(jqm_listview, deviceType)
{
    var _self = this;

    this.deviceType = deviceType;
    this.listviewObj = jqm_listview;
    this.isScanning = false;
    this.isInitialized = false;

    this.bluetoothDevices = [];
    this.deviceObject = null;

    this.writeResult = {
        error: 0,
        errorDescription: '',
        status: BLE.STATUS_NONE,
        value: ''
    };

    this.readResult = {
        error: 0,
        errorDescription: '',
        status: BLE.STATUS_NONE,
        value: ''
    };

    this.subscriptionResult = {
        error: 0,
        errorDescription: '',
        status: BLE.STATUS_NONE,
        value: ''
    };

    // ----------------------------------------------------------------------------------------------------------------
    // Helper Functions
    // ----------------------------------------------------------------------------------------------------------------

    this.postMessage = function (msg) {
        navigator.notification.alert(msg, null, 'Notification');
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Bluetooth Initialization
    // ----------------------------------------------------------------------------------------------------------------

    this.init = function () {
        try
        {
            var params = { request: true };
            bluetoothle.initialize(_self.initializeSuccess, _self.initializeError, params);
        }
        catch (e)
        {
            _self.postMessage ('init: ' + e);
        }
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

    this.scanDevices = function () {
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
        try
        {
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
        catch (e)
        {
            _self.postMessage ('startScanSuccess: ' + e);
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
                _self.deviceObject.statusObject.text('Discovering Services ...');
                _self.discoverServices();
                break;

            case 'connecting':
                _self.deviceObject.itemObject.css('background-color', '#ffffaa');
                _self.deviceObject.statusObject.text('Connecting ...');
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
        _self.subscribe();

        _self.deviceObject.isDiscovered = true;
        _self.deviceObject.statusObject.text('Connected');
        _self.deviceObject.itemObject.css('background-color', '#99ff99');
    }

    this.discoverServicesError = function (result) {
        _self.postMessage("discoverError: " + JSON.stringify(result));
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Subscribe
    // ----------------------------------------------------------------------------------------------------------------

    this.subscribe = function () {
        var params = {
            address: _self.deviceObject.address,
            serviceUuid: BLE.SERVICE_UUID,
            characteristicUuid: BLE.CHARACTERISTIC_UUID,
            isNotification: true
        };

        _self.subscriptionResult.error = 0;
        _self.subscriptionResult.errorDescription = '';
        _self.subscriptionResult.status = BLE.STATUS_SUBSCRIBING;
        _self.writeResult.value = '';

        bluetoothle.subscribe(_self.subscribeSuccess, _self.subscribeError, params);
    }

    this.subscribeSuccess = function (result) {
        switch (result.status) {
            case 'subscribed':
                _self.subscriptionResult.status = BLE.STATUS_SUBSCRIBED;

                // Test Transmit
                setTimeout(function () {
                    // Test Transmit
                    _self.postMessage('Transmit Successful: ' + _self.sendToDevice('CMD+ULG;green'));
                }, 1000);

                break;

            case 'subscribedResult':
                _self.subscriptionResult.value = bluetoothle.bytesToString(bluetoothle.encodedStringToBytes(result.value));
                _self.postMessage('Subscription Result: ' + _self.subscriptionResult.value);
                break;
        }
    }

    this.subscribeError = function (result) {
        _self.subscriptionResult.error = 1;
        _self.subscriptionResult.errorDescription = result.status;
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
                serviceUuid: BLE.SERVICE_UUID,
                characteristicUuid: BLE.CHARACTERISTIC_UUID
            };

            _self.writeResult.error = 0;
            _self.writeResult.errorDescription = '';
            _self.writeResult.status = BLE.STATUS_SENDING;
            _self.writeResult.value = stringMessage;

            bluetoothle.write(_self.sendSuccess, _self.sendError, params);
            while (_self.writeResult.error == 0 && _self.writeResult.status != BLE.STATUS_SENT);
            return _self.writeResult.error == 0 && _self.writeResult.status == BLE.STATUS_SENT;
        }
        catch (e) {
            _self.postMessage('sendToDevice Err: ' + e);
        }
    }

    this.sendSuccess = function (result) {
        if (result.status == 'written')
            _self.writeResult.status = BLE.STATUS_SENT;
    }

    this.sendError = function (result) {
        _self.writeResult.error = 1;
        _self.writeResult.errorDescription = result.status;
        _self.writeResult.stutus = BLE.STATUS_ERROR;
        _self.postMessage('sendError: ' + JSON.stringify(result));
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Receiving 
    // ----------------------------------------------------------------------------------------------------------------

    this.receiveFromDevice = function () {
        try
        {
            var params = {
                address: _self.deviceObject.address,
                serviceUuid: BLE.SERVICE_UUID,
                characteristicUuid: BLE.CHARACTERISTIC_UUID
            };

            _self.readResult.error = 0;
            _self.readResult.errorDescription; '';
            _self.readResult.status = BLE.STATUS_RECEIVING;
            _self.readResult.value = '';

            bluetoothle.read(_self.receiveSuccess, _self.receiveError, params);
            //while (_self.readResult.error == 0 && _self.readResult.status != BLE.STATUS_RECEIVED);
            //return _self.readResult.error == 0 && _self.readResult.status == BLE.STATUS_RECEIVED;
        }
        catch (e) {
            _self.postMessage('receiveFromDevice: ' + e);
        }
    }

    this.receiveSuccess = function (result) {
        _self.postMessage('receiveSuccess: ' + JSON.stringify(result));

        try
        {
            if (result.status == 'read')
            {
                _self.readResult.status = BLE.STATUS_RECEIVED;
                _self.readResult.value = bluetoothle.bytesToString(bluetoothle.encodedStringToBytes(result.value));

                _self.postMessage('Value ---> ' + _self.readResult.value);
            }
        }
        catch (e) {
            _self.postMessage('receiveSuccess Exception: ' + e);
        }
    }

    this.receiveError = function (result) {
        _self.postMessage('receiveError: ' + JSON.stringify(result));
        _self.readResult.error = 1;
        _self.writeResult.stutus = BLE.STATUS_ERROR;
        _self.readResult.errorDescription = result.status;
    }
}
