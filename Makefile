test: export PORT=8070
test: export LOG_ERRORS=false
test: export DB_HOST=localhost
test: export DB_PORT=5442
test: export DB_USER=unics_social
test: export DB_PASSWORD=password123
test: export DB_DATABASE=unics_social
test:
	docker-compose -f tests/docker-compose.yml up -d db
	@node scripts/waitForPort $(DB_PORT)
	npx jest tests --coverage --runInBand && (docker-compose -f tests/docker-compose.yml down; exit) || (docker-compose -f tests/docker-compose.yml down; exit 1)
