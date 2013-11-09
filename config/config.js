
app.controller('GithubCtrl', ['$scope', function ($scope) {

  $scope.config = $scope.providerConfig();
  $scope.new_username = "";
  $scope.new_level = "tester";
  $scope.config.whitelist = $scope.config.whitelist || [];
  $scope.config.pull_requests = $scope.config.pull_requests || 'none';

  $scope.save = function () {
    $scope.providerConfig($scope.config, function () {});
  };

  $scope.$watch('config.pull_requests', function (value, old) {
    if (!old || value === old) return;
    $scope.providerConfig({
      pull_requests: $scope.config.pull_requests
    });
  });

  $scope.addWebhooks = function () {
    $scope.loadingWebhooks = true;
    $.ajax($scope.api_root + 'github/hook', {
      type: 'POST',
      success: function () {
        $scope.loadingWebhooks = false;
        $scope.success('Set github webhooks', true);
      },
      error: function () {
        $scope.loadingWebhooks = false;
        $scope.error('Failed to set github webhooks', true);
      }
    });
  };

  $scope.deleteWebhooks = function () {
    $scope.loadingWebhooks = true;
    $.ajax($scope.api_root + 'github/hook', {
      type: 'DELETE',
      success: function () {
        $scope.loadingWebhooks = false;
        $scope.success('Removed github webhooks', true);
      },
      error: function () {
        $scope.loadingWebhooks = false;
        $scope.error('Failed to remove github webhooks', true);
      }
    });
  };

  $scope.removeWL = function (user) {
    var idx = $scope.config.whitelist.indexOf(user);
    if (idx === -1) return console.error("tried to remove a whitelist item that didn't exist");
    var whitelist = $scope.config.whitelist.slice();
    whitelist.splice(idx, 1);
    $scope.providerConfig({
      whitelist: whitelist
    }, function () {
      $scope.config.whitelist = whitelist;
    });
  };

  $scope.addWL = function (user) {
    if (!user.name || !user.level) return;
    var whitelist = $scope.config.whitelist.slice();
    whitelist.push(user);
    $scope.providerConfig({
      whitelist: whitelist
    }, function () {
      $scope.config.whitelist = whitelist;
    });
  };

}]);
