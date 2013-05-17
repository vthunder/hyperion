// find out host we're on
// sadtimes: global
var appurl = document.createElement('a');
appurl.href = "/";
appurl = appurl.href;

angular.module("app", ['firebase'])

  .value('purl', purl)
  .value('appurl', appurl)
  .value('firebaseurl', "https://openhome.firebaseio.com/")
  .value('client_id', (appurl == "http://localhost:8000"?
                       "798c72ca5049c8da83542ec260ecf9e9" : // dev sandbox
                       "caab71371395bc5051173950c0f33822")) // vthunder.github.io/hyperion

  .factory('authService', function($rootScope, firebaseurl) {

    var user = {};

    return {
      login: function() {
        this.client.login('persona');
      },
      logout: function() {
        this.client.logout();
        delete user.id;
        $rootScope.$broadcast('authStateChange', user);
      },
      client: new FirebaseAuthClient(
        new Firebase(firebaseurl), function(error, userInfo) {
          if (error)
            user.lastAuthError = error;
          else if (userInfo)
            user.id = userInfo.id;
          else
            delete user.id;
          $rootScope.$broadcast('authStateChange', user);
        })
    };
  })

  .factory('singly', function($rootScope, $location, $http, $window,
                              purl, appurl, client_id) {
    var singly = {};

    return {
      connect: function(service) {
        var redirect_uri = encodeURIComponent(appurl);
        var access_token = singly.access_token? singly.access_token : "";

        var url = "https://api.singly.com/oauth/authenticate" +
          "?client_id=" + client_id +
          "&redirect_uri=" + redirect_uri +
          "&service=" + service +
          (access_token? ("&access_token=" + access_token) : "") +
          "&response_type=token";

        $window.location.href = url;
      },
      checkUrlParams: function() {
        var url = purl($location.absUrl());
        var access_token = url.fparam('access_token') || url.fparam('/access_token');
        var account = url.fparam('account') || url.fparam('/account');
        if (access_token) {
          this.connectComplete(access_token, account);
        }
      },
      connectComplete: function(access_token, account) {
        singly.access_token = access_token;
        singly.account = account;
        $rootScope.$broadcast('singlyConnected', singly);
      },
      getProfile: function() {
        return $http.get("https://api.singly.com/profile?access_token=" +
                         singly.access_token);
      }
    };
  })

  .controller('AppCtrl', function($scope, authService, singly) {

    $scope.auth = {};
    $scope.user = {
      name: "Anonymous"
    };

    $scope.$on('authStateChange', function(event, userAuth) {
      $scope.auth = userAuth;
      if (!$scope.auth.id)
        $scope.user = {
          name: "Anonymous"
        };
      $scope.$safeApply($scope);

      // checks for OAuth token in url params - XXX should this go elsewhere?
      singly.checkUrlParams();
    });
    $scope.$on('singlyConnected', function() {
      singly.getProfile()
        .success(function(profile) {
          $scope.user = profile;
          $scope.$safeApply($scope);
        });
    });

    $scope.signin = function() { authService.login(); };
    $scope.signout = function() { authService.logout(); };
    $scope.connect = function(service) { singly.connect(service); };
  })

  // init

  .run(function($rootScope) {
    // provides $scope.$safeApply (for any sub-scope)
    $rootScope.$safeApply = function ($scope, fn) {
      fn = fn || function() {};
      if($scope.$$phase) {
        //don't worry, the value gets set and AngularJS picks up on it...
        fn();
      }
      else {
        //this will fire to tell angularjs to notice that a change has happened
        //if it is outside of it's own behaviour...
        $scope.$apply(fn); 
      }
    };
  });

// Init Foundation JS components
$(document).foundation();
