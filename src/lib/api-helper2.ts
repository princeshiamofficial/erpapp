Base URL https://api.colorhutbd.xyz/dbv3/index.php Collections

List All Collections GET /collections
curl -X GET "https://api.colorhutbd.xyz/dbv3/index.php/collections"

{ "collections": [ { "name": "users", "document_count": 25, "created_at": "2025-09-04T12:32:00+06:00" }, { "name": "products", "document_count": 50, "created_at": "2025-09-01T09:10:00+06:00" } ] }

Create Collection POST /collections
curl -X POST "https://api.colorhutbd.xyz/dbv3/index.php/collections"
-H "Content-Type: application/json"
-d '{"name":"users"}'

{ "message": "Collection created successfully", "collection": { "name": "users", "created_at": "2025-09-04T12:32:00+06:00" } }

Delete Collection DELETE /collections/{collection_name}
curl -X DELETE "https://api.colorhutbd.xyz/dbv3/index.php/collections/users"

{ "message": "Collection deleted successfully" }

Documents

List/Search Documents GET /collections/{collection_name}/documents?limit=10&offset=0&search=keyword
curl -X GET "https://api.colorhutbd.xyz/dbv3/index.php/collections/users/documents?limit=5&offset=0&search=john"

{ "documents": [ { "id": "doc_64f3a1a2e4", "data": { "title": "John Doe", "status": "active" }, "created_at": "2025-09-04T12:32:00+06:00", "updated_at": "2025-09-04T12:32:00+06:00" } ], "total": 1, "limit": 5, "offset": 0, "search": "john" }

Get Document by ID GET /collections/{collection_name}/documents/{document_id}
curl -X GET "https://api.colorhutbd.xyz/dbv3/index.php/collections/users/documents/doc_64f3a1a2e4"

{ "id": "doc_64f3a1a2e4", "data": { "title": "John Doe", "status": "active" }, "created_at": "2025-09-04T12:32:00+06:00", "updated_at": "2025-09-04T12:32:00+06:00" }

Create Document POST /collections/{collection_name}/documents
curl -X POST "https://api.colorhutbd.xyz/dbv3/index.php/collections/users/documents"
-H "Content-Type: application/json"
-d '{"id":"doc_001","data":{"title":"Jane Doe","status":"active"}}'

{ "id": "doc_001", "data": { "title": "Jane Doe", "status": "active" }, "created_at": "2025-09-04T12:40:00+06:00", "updated_at": "2025-09-04T12:40:00+06:00" }

Update Document PUT /collections/{collection_name}/documents/{document_id}
curl -X PUT "https://api.colorhutbd.xyz/dbv3/index.php/collections/users/documents/doc_001"
-H "Content-Type: application/json"
-d '{"data":{"status":"inactive"}}'

{ "id": "doc_001", "data": { "title": "Jane Doe", "status": "inactive" }, "created_at": "2025-09-04T12:40:00+06:00", "updated_at": "2025-09-04T12:45:00+06:00" }

Delete Document DELETE /collections/{collection_name}/documents/{document_id}
curl -X DELETE "https://api.colorhutbd.xyz/dbv3/index.php/collections/users/documents/doc_001"

{ "message": "Document deleted successfully" }

Notes & Tips Data is stored in JSON files under /collections directory. Timestamps created_at and updated_at are auto-managed. Search is case-insensitive and scans all fields in data. Pagination uses limit and offset. Document IDs are unique within a collection. Can be auto-generated or custom. Collection names allow only letters, numbers, underscores, hyphens. Use Content-Type: application/json header for POST/PUT requests.
