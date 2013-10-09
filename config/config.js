
app.controller('GithubCtrl', ['$scope', function ($scope) {

  $scope.config = $scope.providerConfig();
  $scope.config.new_username = "";
  $scope.config.new_level = "tester";
  $scope.config.whitelist = $scope.config.whitelist || [];
  $scope.config.pull_requests = $scope.config.pull_requests || 'none';

  $scope.addWebhooks = function () {
    setTimeout(function () {
      $scope.error('add webhooks not implemented', true);
    }, 0);
  };

  $scope.deleteWebhooks = function () {
    setTimeout(function () {
      $scope.error('remove webhooks not implemented', true);
    }, 0);
  };

  $scope.removeWL = function (user) {
    var idx = $scope.config.whitelist.indexOf(user);
    if (idx === -1) return console.error("tried to remove a whitelist item that didn't exist");
    $scope.config.whitelist.splice(idx, 1);
    setTimeout(function () {
      $scope.error('save whitelist not implemented', true);
    }, 0);
  };

  $scope.addWL = function (user) {
    if (!user.name || !user.level) return;
    $scope.config.whitelist.push(user);
    setTimeout(function () {
      $scope.error('save whitelist not implemented', true);
    }, 0);
  };

}]);
