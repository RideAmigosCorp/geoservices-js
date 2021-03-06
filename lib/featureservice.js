var querystring = require('querystring'),
    request = require('request');

function FeatureService (options, callback) {
  if (!(this instanceof FeatureService)) return new FeatureService(options, callback);
  this.lastQuery = null;
  this.url       = null;
  this.options   = options;
  this.callback  = callback;

  this.get();
}

FeatureService.prototype.buildUrl = function () {
  var options = this.options;

  var url;
  if (this.options.url) {
    url = this.options.url;
  } else {
    url = [ this.options.catalog, this.options.service, this.options.type ].join('/') + (this.options.layer ? '/' + this.options.layer : '');
  }

  return url;
};

FeatureService.prototype.get = function () {
  var options = this.options;
  var callback = this.callback;

  if (options &&
      !options.catalog && !options.service && !options.type &&
      !options.url ) {
    if (this.callback) {
      callback('Must provide at least a feature service "catalog", "service" and "type", or a "url" to a feature service or feature layer');
    }

    return;
  }

  this.url = this.buildUrl();

  this.token = options.token;

  this.issueRequest(null, {
    f: options.format || 'json'
  }, callback);
};


// internal callback wrapper for err logic
function _internalCallback(err, data, cb){
  try {
    data = JSON.parse(data);
  } catch (jsonParseError) {
    if (cb) {
      cb('Error parsing JSON in Feature Service response: ' + jsonParseError, data);
    }
    return;
  }

  if (cb) {
    // check for an error passed in this response
    if (data && data.error ) {
      cb( data.error, null);
    } else {
      cb( err, data );
    }
  }
}

FeatureService.prototype.issueRequest = function (endPoint, parameters, cb, method) {
  parameters.f = parameters.f || 'json';
  parameters.outFields = parameters.outFields || '*';
  if(parameters.token || this.token){
    parameters.token = parameters.token || this.token;
  }

  var urlPart = '';

  if (endPoint) {
    urlPart = '/' + endPoint;
  }

  var url = this.url + urlPart;

  if (!method || method.toLowerCase() === "get") {
    url = url + '?' + querystring.stringify(parameters);

    request.get(url, function (err, req, data) {
      _internalCallback(err, data, cb);
    });
  } else {
    //assuming method is POST
    //TODO: change this to use method values if there are feature service operations that use PUT or DELETE
    request.post(url, function(err, req, data) {
      _internalCallback(err, data, cb);
    }).form(parameters);
  }
};

function _ensureStringified(parameters, properties) {
  if(Object.prototype.toString.call(properties) !== '[object Array]') {
    properties = [properties];
  }
  for (var i=0; i < properties.length; i++) {
    var property = properties[i];
    if (parameters && parameters.hasOwnProperty(property)) {
      var o = parameters[property];
      if (typeof o != 'string' && Object.prototype.toString.call(o) != '[object String]') {
        parameters[property] = JSON.stringify(o);
      }
    }
  }
}

// issues a query to the server
FeatureService.prototype.query = function (parameters, callback) {
  this.lastQuery = parameters;
  var method = parameters.method || 'get';
  delete parameters.method;
  this.issueRequest('query', parameters, callback, method);
};

// issues a count only query to the server
FeatureService.prototype.count = function (parameters, callback) {
  parameters.returnCountOnly = true;
  parameters.returnIdsOnly = false;
  this.query(parameters, callback);
};

// issues an id's only query to the server
FeatureService.prototype.ids = function (parameters, callback) {
  parameters.returnIdsOnly = true;
  parameters.returnCountOnly = false;
  this.query(parameters, callback);
};

// issues an update request on the feature service
FeatureService.prototype.update = function (parameters, callback) {
  _ensureStringified(parameters, 'features');
  this.issueRequest('updateFeatures', parameters, callback, 'post');
};

// issues an add request on the feature service
FeatureService.prototype.add = function (parameters, callback) {
  _ensureStringified(parameters, 'features');
  this.issueRequest('addFeatures', parameters, callback, 'post');
};

// issues a remove request on the feature service
FeatureService.prototype.remove = function (parameters, callback) {
  this.issueRequest('deleteFeatures', parameters, callback, 'post');
};

// issues an edit request on the feature service
// this applies adds, updates, and deletes in a single request
FeatureService.prototype.edit = function (parameters, callback) {
  _ensureStringified(parameters, ['adds','updates']);
  this.issueRequest('applyEdits', parameters, callback, 'post');
};

// issues a query related records request to the server
FeatureService.prototype.queryRelatedRecords = function (parameters, callback) {
  this.lastQuery = parameters;
  var method = parameters.method || 'get';
  delete parameters.method;
  this.issueRequest('queryRelatedRecords', parameters, callback, method);
};

exports.FeatureService = FeatureService;
