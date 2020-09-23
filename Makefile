test: export PORT=8070
test: export LOG_ERRORS=false
test: export HOST=http://localhost:3000
test: export DB_HOST=localhost
test: export DB_PORT=5442
test: export DB_USER=unics_social
test: export DB_PASSWORD=password123
test: export DB_DATABASE=unics_social
test: export SENDGRID_TOKEN=SG.abc123
test: export SENDGRID_FROM_EMAIL=noreply@unicsmcr.com
test: export MOCK_EMAIL_SERVICE=false
test: export JWT_SECRET=thisisasecret
test: export TWILIO_ACCOUNT_SID=AC123
test: export TWILIO_AUTH_TOKEN=token123
test: export TWILIO_API_KEY=SKxxxx
test: export TWILIO_SECRET=randomstringggg123
test: export DISCORD_CLIENT_ID=abc
test: export DISCORD_CLIENT_SECRET=abc
test: export DISCORD_OAUTH2_SECRET=abc
test: export DISCORD_GUILD_ID=abc
test:
	docker-compose -f tests/docker-compose.yml up -d db
	@node scripts/waitForPort $(DB_PORT)
	npx jest tests --coverage --runInBand && (docker-compose -f tests/docker-compose.yml down -v; exit) || (docker-compose -f tests/docker-compose.yml down -v; exit 1)
