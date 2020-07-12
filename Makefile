test: export PORT=8060
test: export DB_HOST=localhost
test: export DB_PORT=5432
test: export DB_USER=unics_social
test: export DB_PASSWORD=password123
test: export DB_DATABASE=unics_social
test:
	docker-compose -f tests/docker-compose.yml up -d db
	sleep 5
	npx jest tests --coverage && (docker-compose -f tests/docker-compose.yml down; exit) || (docker-compose -f tests/docker-compose.yml down; exit 1)
