(function () {
  var params = new URLSearchParams(location.search);
  var code = params.get('code');
  var error = params.get('error');
  var state = params.get('state');

  var card = document.getElementById('card');
  var titleEl = document.getElementById('title');
  var subEl = document.getElementById('subtitle');

  function showSuccess(closingText) {
    card.classList.add('state-success');
    titleEl.textContent = 'Signed in';
    subEl.textContent = closingText || 'Closing…';
  }

  function showError(msg) {
    card.classList.add('state-error');
    titleEl.textContent = 'Sign-in failed';
    subEl.textContent = msg || 'Something went wrong.';
  }

  if (globalThis.opener && globalThis.opener !== globalThis) {
    var type = (state === 'spotify-auth-callback')
      ? 'spotify-auth-callback'
      : 'google-auth-callback';

    if (error) {
      showError(error);
      setTimeout(function () {
        globalThis.opener.postMessage(
          { type: type, code: null, error: error },
          location.origin
        );
        globalThis.close();
      }, 900);
    } else {
      showSuccess();
      setTimeout(function () {
        globalThis.opener.postMessage(
          { type: type, code: code || null, error: null },
          location.origin
        );
        globalThis.close();
      }, 550);
    }
  } else {
    // No opener — settled state
    if (error) {
      showError('Sign-in error: ' + error);
    } else {
      showSuccess('You can close this window.');
    }
  }
})();
