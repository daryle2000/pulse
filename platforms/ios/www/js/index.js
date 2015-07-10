/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

var DEVICE_TYPE = {
    IPAD: 'ipad',
    IPHONE: 'iphone',
    ANDROID: 'android',
    BLACKBERRY: 'blackBerry',
    UNDETECTED: 'undetected'
};

var BLUETOOTH = {
    RECEIVE_TIMEOUT: 1000            // receive timeout in milliseconds
};

String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function application() {
    this.bluetoothObj = null;

    this.isRunning = false;
    this.executeLabelObj = $('#executeLabel');
    this.executeMessageObj = $('#executeMessage');
    this.deviceType = '';
    this.dataReceived = '';

    var _self = this;
    
    this.initialize = function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    }

    this.onDeviceReady = function () {
        try
        {
            _self.updateStatus();
            _self.deviceType = _self.getDeviceType();

            _self.bluetoothObj = new bluetooth();

            // set parameters
            _self.bluetoothObj.deviceType = _self.deviceType;
            _self.bluetoothObj.listviewObj = $('#connectListView');

            // set callbacks
            _self.bluetoothObj.callbacks.connectCompleted = _self.connectCompleted;
            _self.bluetoothObj.callbacks.sendCompleted = _self.sendCompleted;
            _self.bluetoothObj.callbacks.receiveCompleted = _self.receiveCompleted;
            _self.bluetoothObj.callbacks.dataArrival = _self.dataArrival;
            _self.bluetoothObj.callbacks.closeCompleted = _self.closeCompleted;
            
            // initialize bluetooth
            _self.bluetoothObj.init();

            // Event when Connect item is clicked
            $(document).on('pageshow', '#connectPage', function (event, ui) {
                _self.onConnectPageLoad();
            });

            // Event when Connect page is closing
            $(document).on('pagehide', '#connectPage', function (event, ui) {
                _self.stopScanningDevices();
            });

            StatusBar.show();
            StatusBar.overlaysWebView(false);
            StatusBar.backgroundColorByHexString("#4444ff");
        }
        catch (e) {
            _self.displayMessage('onDeviceReady', e);
        }
    }

    // ----------------------------------------------------------------------------------------------------------------
    // Bluetooth Sending and Receiving
    // ----------------------------------------------------------------------------------------------------------------

    this.sendCommand = function (cmd) {
        _self.dataReceived = '';
        _self.bluetoothObj.sendToDevice(cmd);
    }

    this.getResponse = function () {
        /*
        ("RES+")	// respond signature
        #define CMD_RES_OK					("RES+OK")
        #define CMD_RES_ERR					("RES+ERR")
        */
        var startTime = Date.now();
        var currentTime = startTime;
        var isResponseAvailable = false;
        var isTimedOut = false;

        var lastCount = 0;
        var ret = '';

        while (!isTimedOut && !isResponseAvailable) {
            isResponseAvailable = _self.dataReceived.endsWith('RES+OK') || _self.dataReceived.endsWith('RES+ERR');

            if (_self.dataReceived.length > lastCount) {
                lastCount = _self.dataReceived.length;
                startTime = currentTime;
            }

            if (!isResponseAvailable) {
                currentTime = Date.now();
                isTimedOut = (currentTime - startTime) >= BLUETOOTH.RECEIVE_TIMEOUT;
            }
        }

        if (!isTimedOut)
            ret = _self.dataReceived;

        _self.dataReceived = '';
        return ret;
    }


    // ----------------------------------------------------------------------------------------------------------------
    // Bluetooth Callbacks
    // ----------------------------------------------------------------------------------------------------------------

    this.connectCompleted = function (deviceObject) {
        _self.displayMessage('connectCompleteCallback', deviceObject.name + ' is now connected!');
        _self.bluetoothObj.sendToDevice('CMD+ULG;green');
    }

    this.sendCompleted = function (deviceObject, writeResult) {
        _self.displayMessage('sendCompleted response: ', _self.getResponse());
    }

    this.receiveCompleted = function (deviceObject, readResult) {
        _self.displayMessage('receiveCompleteCallback', readResult.value);
    }

    this.dataArrival = function (deviceObject, subscriptionResult) {
        _self.dataReceived += subscriptionResult.value;
    }

    this.closeCompleted = function (deviceObject) {
        _self.displayMessage('closeCompleteCallback', deviceObject.name + ' is disconnected!');
    }

    // ---

    this.updateStatus = function () {
        // ---
        // update clock/time
        // ---
        var statClockObj = $('#clock');
        statClockObj.html(_self.getDate() + ' ' + _self.getTime() + ' (Runtime hh:mm)');

        // ---
        // update schedule status
        // ---
        _self.executeUpdateDisplay();
    }

    this.onConnectPageLoad = function () {
        _self.scanDevices();
    }

    // -------------------------------------------------------------------------------------------
    // Bluetooth Functions
    // -------------------------------------------------------------------------------------------

    this.scanDevices = function () {
        _self.bluetoothObj.scanDevices();
    }

    this.stopScanningDevices = function () {
        _self.bluetoothObj.stopScan();
    }

    // -------------------------------------------------------------------------------------------
    // Sprinkler Functions
    // -------------------------------------------------------------------------------------------
    this.executeMode = function () {
        if (_self.isRunning)
            _self.stop();
        else
            _self.run();

        _self.executeUpdateDisplay();
    }

    this.run = function () {
        _self.isRunning = true;
        // run here
    }

    this.stop = function () {
        _self.isRunning = false;
        // stop here
    }

    this.executeUpdateDisplay = function () {
        _self.executeLabelObj.css('font-size', '30px');

        if (_self.isRunning) {
            _self.executeLabelObj.css('color', '#bb0000');
            _self.executeLabelObj.html('STOP');
            _self.executeMessageObj.html('Sprinkler is currently running. Stop sprinkler from running saved schedules.');
        }
        else {
            _self.executeLabelObj.css('color', '#009900');
            _self.executeLabelObj.html('RUN');
            _self.executeMessageObj.html('Sprinkler is current stopped. Run/Monitor sprinkler schedules.');
        }
    }

    // -------------------------------------------------------------------------------------------
    // Essential Functions
    // -------------------------------------------------------------------------------------------

    this.getDate = function () {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1; 

        var yyyy = today.getFullYear();
        if (dd < 10)
            dd = '0' + dd;
        if (mm < 10)
            mm = '0' + mm;

        return mm + '-' + dd + '-' + yyyy;
    }

    this.getTime = function () {
        var now = new Date();
        var hrs = now.getHours();
        var min = now.getMinutes();

        if (hrs < 10)
            hrs = '0' + hrs;

        if (min < 10)
            min = '0' + min;

        return hrs + ':' + min;
    }

    this.getDeviceType = function () {
        if (navigator.userAgent.match(/iPad/i) == "iPad")
            return DEVICE_TYPE.IPAD;
        
        if (navigator.userAgent.match(/iPhone/i) == "iPhone")
            return DEVICE_TYPE.IPHONE;

        if (navigator.userAgent.match(/Android/i) == "Android")
            return DEVICE_TYPE.ANDROID;

        if (navigator.userAgent.match(/BlackBerry/i) == "BlackBerry")
            return DEVICE_TYPE.BLACKBERRY;

        return DEVICE_TYPE.UNDETECTED;
    }

    this.displayMessage = function (title, message) {
        navigator.notification.alert (message, null, title);
    }
}