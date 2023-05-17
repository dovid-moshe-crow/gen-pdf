# gen-pdf
 
## endpoints

* `/pdf-table` 

`body` 
```json
{
    "data": [
        {
            "col1": "stuff",
            "col2": "other stuff"
        },
        {
            "col1": "nothing",
            "col2": "more stuff"
        }
    ],
    "headers": {
        "col1": "header name 1",
        "col2": "header name 2"
    }
}
:```