variable "TAG" {
  default = "latest"
}

group "default" {
  targets = ["app"]
}

target "app" {
  context    = "."
  dockerfile = "./Dockerfile"
  tags       = ["orochibraru/bercail:latest", "orochibraru/bercail:${TAG}"]
  output     = ["type=docker"]
}

target "app-ci" {
  inherits   = ["app"]
  output     = []
  platforms  = ["linux/amd64", "linux/arm64"]
  cache-from = ["type=gha,scope=app"]
  cache-to   = ["type=gha,mode=max,scope=app"]
}
