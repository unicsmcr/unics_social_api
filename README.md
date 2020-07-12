# UniCS Social: API

![Tests](https://github.com/unicsmcr/unics_social_api/workflows/Tests/badge.svg)
![Lint](https://github.com/unicsmcr/unics_social_api/workflows/Lint/badge.svg)
[![codecov](https://codecov.io/gh/unicsmcr/unics_social_api/branch/main/graph/badge.svg)](https://codecov.io/gh/unicsmcr/unics_social_api)

An API Server for UniCS's networking platform for its members at the University of Manchester.

## Getting Started

- Install [Node.js v12 or v14](https://nodejs.org/)
- Install Docker:
	- **Linux**: first install [the engine](https://docs.docker.com/engine/install/#server), then install [docker-compose](https://docs.docker.com/compose/install/)
	- **Windows**: install [Docker Desktop on Windows](https://docs.docker.com/docker-for-windows/install/)
	- **Mac** - install [Docker Desktop on Mac](https://docs.docker.com/docker-for-mac/install/)
- Verify that the installations have succeeded. You should be able to run these commands and get similar output:
	```
	$ node --version
	v14.5.0

	$ npm --version
	6.14.5

	$ docker --version
	Docker version 19.03.12, build 48a66213fe

	$ docker-compose --version
	docker-compose version 1.25.5, build 8a1c60f6
	```
- Clone the repo, and install the Node.js dependencies of this project:
	```bash
	$ git clone git@github.com:unicsmcr/unics_social_api.git
	# or you can clone with HTTPS

	$ cd unics_social_api

	$ npm install
	```
- You now need to create an `.env` file - this is a configuration file for the project. You can just copy the included `.env.example` to create yours. I would not recommend changing it unless the existing values cause problems.
- Launch the PostgreSQL database and its admin tool:
	```
	$ docker-compose up -d
	```

	> The `-d` flag means detached, and allows the services to run in the background and not block your terminal.
	>
	> To access the admin tool, head to `http://localhost:5050` in your web browser, and use `admin@admin.com` and `password` as your login details. This allows you to interact with your local instance of the database with a friendly GUI.
- Now you can run the actual UniCS Social Server! Whenever you make changes, you will need to re-run this command.
	```
	$ npm run build && node dist/app
	```
- After you've made changes, you can run tests to ensure that nothing broke and the coverage is still high!
	```
	$ npm test
	```
- You can shutdown the database and its admin tool once you're done:
	```
	$ docker-compose down
	```
## License

> Copyright 2020 UniCS
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
> 
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
> 
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
