if ! docker ps -a --format '{{.Names}}' | grep -q '^dynamodb-local$'; then
  # Container does not exist, create and start it
  docker run -d --name dynamodb-local -p 8000:8000 amazon/dynamodb-local
elif ! docker ps --format '{{.Names}}' | grep -q '^dynamodb-local$'; then
  # Container exists but is not running, start it
  docker start dynamodb-local
else
  # Container is already running
  echo "DynamoDB Local container is already running."
fi