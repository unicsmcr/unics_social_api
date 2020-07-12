test:

	@PORT=8060

	@DB_HOST=localhost
	@DB_PORT=5432
	@DB_USER=unics_social
	@DB_PASSWORD=password123
	@DB_DATABASE=unics_social

	docker-compose -f tests/docker-compose.yml up -d db
	sleep 5
	npx jest tests --coverage && (docker-compose -f tests/docker-compose.yml down; exit) || (docker-compose -f tests/docker-compose.yml down; exit 1)
