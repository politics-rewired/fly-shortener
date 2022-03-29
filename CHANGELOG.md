# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.3.0](https://github.com/politics-rewired/fly-shortener/compare/v1.2.3...v1.3.0) (2022-03-29)


### Features

* support ipv6 redis connections ([13311fa](https://github.com/politics-rewired/fly-shortener/commit/13311fac76c6f32606a94e929c62b160c06d57cb))

### [1.2.3](https://github.com/politics-rewired/fly-shortener/compare/v1.2.2...v1.2.3) (2022-03-29)


### Bug Fixes

* revert redis url envvar type ([1f5ab57](https://github.com/politics-rewired/fly-shortener/commit/1f5ab57833e8c43fd78e64932adecbec2dd63d79))

### [1.2.2](https://github.com/politics-rewired/fly-shortener/compare/v1.2.1...v1.2.2) (2022-03-29)


### Bug Fixes

* update redis url ennvar name ([5dbf1ff](https://github.com/politics-rewired/fly-shortener/commit/5dbf1ffdb064a6243e21dda00d7b6c9209a894a6))

### [1.2.1](https://github.com/politics-rewired/fly-shortener/compare/v1.2.0...v1.2.1) (2021-11-04)


### Bug Fixes

* use timezone config for cache ttl ([#29](https://github.com/politics-rewired/fly-shortener/issues/29)) ([a15c4e0](https://github.com/politics-rewired/fly-shortener/commit/a15c4e080b9ff525ca5745982ce7b2355adb0692))

## [1.2.0](https://github.com/politics-rewired/fly-shortener/compare/v1.1.0...v1.2.0) (2021-08-30)


### Features

* add timezone support for date code replacement ([9bba388](https://github.com/politics-rewired/fly-shortener/commit/9bba38873fa1701f689ced57fca4ea3fc607fe52))

## [1.1.0](https://github.com/politics-rewired/fly-shortener/compare/v1.0.0...v1.1.0) (2021-08-29)


### Features

* add healthcheck ([a65628c](https://github.com/politics-rewired/fly-shortener/commit/a65628ca1360260eafc8df694db2544f125015d6))


### Bug Fixes

* handle empty values and log errors ([e880993](https://github.com/politics-rewired/fly-shortener/commit/e88099305d3303c12fc82ae37488b7c080186af1))

## 1.0.0 (2021-03-07)


### Features

* add regex replacement and YYMMDD support ([86e28af](https://github.com/politics-rewired/fly-shortener/commit/86e28af5afef41c6fcf1e24df4b9a78945d50199))
* allow configuration of 404 response ([45e0157](https://github.com/politics-rewired/fly-shortener/commit/45e0157452b0e1dbd0c9013b9e9d41536e78da94))
* cache Google access token ([883fd27](https://github.com/politics-rewired/fly-shortener/commit/883fd273f02f06596918f59701f26e12ec474217))
* disable caching redirect responses ([#19](https://github.com/politics-rewired/fly-shortener/issues/19)) ([c58dc35](https://github.com/politics-rewired/fly-shortener/commit/c58dc35bfe76c7b409b304cdbb9347a14493291a))
* normalize paths from both sources ([b8d5bb7](https://github.com/politics-rewired/fly-shortener/commit/b8d5bb7cbeedcf595d2948a3e2954a823cea356f))
* scope non-refresh to path ([7ffb7d7](https://github.com/politics-rewired/fly-shortener/commit/7ffb7d7e69ea528eff6640be0ebeba8bac4b993c))
* source sheet range from secret ([f8d3e13](https://github.com/politics-rewired/fly-shortener/commit/f8d3e134fbd116b41660b817e2bc936af25ae1e0))
* switch to Google Sheets as backend ([7978867](https://github.com/politics-rewired/fly-shortener/commit/79788675a4c7835b391b5d4d543f42003ff4a87e))


### Bug Fixes

* add content-type response header ([43bd9ee](https://github.com/politics-rewired/fly-shortener/commit/43bd9ee679e8f422ac420bbf360d8c425fb6cb84))
* destination not defiend ([7c4e633](https://github.com/politics-rewired/fly-shortener/commit/7c4e633ac6b8ee7fe6094b9fa7254e97f93b83dd))
* filter empty records ([efcb454](https://github.com/politics-rewired/fly-shortener/commit/efcb454275f8a98a214e298c6e2bd829363a7d34))
* prevent caching of per-invocation constants ([#21](https://github.com/politics-rewired/fly-shortener/issues/21)) ([d241e8e](https://github.com/politics-rewired/fly-shortener/commit/d241e8e54eb2f03b94e4d496f3dfebf120834a5c))
* switch to v8-compatible JWT library ([2b6e8bb](https://github.com/politics-rewired/fly-shortener/commit/2b6e8bbbc7a13a29c4b2b16671097587c6687bfe))
