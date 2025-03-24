```bash
# Example of a POST request with JSON data
curl -X POST http://localhost:8000/ \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d '{
        "tool": "query_data",
        "arguments": {
            "sql": "select * from people"
        }
    }'
```

This curl command sends a POST request to `https://api.example.com/data` with:

- Content-Type header set to application/json
- Authorization header with a bearer token
- JSON payload containing name, email, and message fields
