<p align="center">
<img src="src/assets/img/logo.svg" width="40%"><br>
<strong>
A chrome/firefox extension to show distraction free nepali date on your new tab.
</strong><br>

<span>
<a href="http://hits.dwyl.com/sidbelbase/undistracted-me"><img src="http://hits.dwyl.com/sidbelbase/undistracted-me.svg" alt="Total Hits"></a>
<a href="https://chrome.google.com/webstore/detail/undistracted-me/dfgbijakkhepoonhaelocdmcleeehmef/"><img src="https://img.shields.io/chrome-web-store/users/dfgbijakkhepoonhaelocdmcleeehmef?logo=google-chrome&logoColor=white&style=flat-square" alt="Chrome Users"></a>
<a href="https://addons.mozilla.org/en-US/firefox/addon/undistracted-me/"><img src="https://img.shields.io/amo/users/{1071d037-0f17-4c92-b06c-704050d2e2c3}?logo=firefox&logoColor=white&style=flat-square" alt="Firefox Users"></a>
 <a href="https://github.com/sidbelbase/undistracted-me/releases"><img src="https://img.shields.io/github/v/release/sidbelbase/undistracted-me?style=flat-square" alt="Releases"></a>
<a href="https://chrome.google.com/webstore/detail/undistracted-me/dfgbijakkhepoonhaelocdmcleeehmef/">
<img alt="Rating On Chrome Web Store" src="https://img.shields.io/chrome-web-store/rating/dfgbijakkhepoonhaelocdmcleeehmef?style=flat-square"></a>
</span>

</p>

<img src="src/assets/img/hero.png" width="100%" height="auto">

## Deployments

- [Chrome Web Store](https://chrome.google.com/webstore/detail/undistracted-me/dfgbijakkhepoonhaelocdmcleeehmef/)

- [Firefox Addons](https://addons.mozilla.org/en-US/firefox/addon/undistracted-me/)

- [Official Website](https://whatsthemiti.sarojbelbase.com.np/)

## Build Setup

``` bash
# first, install dependencies
npm install

# minify and build for production inside dist folder
npm run build

# finally, build with `web-ext`
npm run build:firefox
```

It will generate a zip file inside `web-ext-artifacts` folder, which you can upload to chrome web store or firefox addons store.

## Offline Installation

1. First **Clone or Download** this repository.
2. After successfull download, unzip it with your archive manager.
3. Open extensions page using [chrome://extensions](chrome://extensions)
4. Now enable **Developer mode** located on your right side of navigation bar.
5. Click on **Load Unpacked** and select your unzipped folder.

If everything goes right, you could see undistracted me working seamlessly on your chrome and its variants.

## Roadmap

1. [x] Publish on Firefox
2. [x] Publish on Chrome
3. [ ] Add more features requested by users

## Feature Requests

1. [ ] Speed dial links like in r/startpages by u/nepmandu
2. [ ] Dewanagiri support by u/pranphy
3. [ ] Toggle between 12/24 hours by u/deeplydark


#### Made with ReactJs in Nepal.