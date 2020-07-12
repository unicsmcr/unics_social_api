test:
	docker-compose -f tests/docker-compose.yml up -d db
	sleep 5
	npx jest tests --coverage && (docker-compose -f tests/docker-compose.yml down; exit) || (docker-compose -f tests/docker-compose.yml down; exit 1)
