.PHONY: plugin api website build-website release clean build-linux build-windows build-mac

all: plugin api

plugin:
	cd plugin && cargo build --release

api:
	cd api && go build -o tflops-api .

website:
	cd website && npm run dev

release: build-website
	./build.sh

build-website:
	cd website && npm run build

build-linux:
	mkdir -p dist/linux
	cd api && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o ../dist/linux/tflops-api .
	./build.sh linux # This will use cross if available

build-windows:
	mkdir -p dist/windows
	cd api && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -o ../dist/windows/tflops-api.exe .
	./build.sh windows

build-mac:
	mkdir -p dist/macos
	cd api && GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build -o ../dist/macos/tflops-api .
	cd plugin && cargo build --release

clean:
	rm -rf dist
	cd plugin && cargo clean
	cd api && rm -f tflops-api

run-api: api
	cd api && ./tflops-api

run-plugin:
	cd plugin && cargo run -- --json

dev-dashboard:
	cd dashboard && npm run dev

seed:
	cd api/seed && go run main.go
