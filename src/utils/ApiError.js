class ApiError extends Error {
    constructor(
        statusCode,             
        // HTTP status code for the error (e.g., 404, 500)
        message = "Something went wrong",  
        // Default message if no message is provided
        errors = [],            
        // An optional array to hold more specific errors or details
        stack = ""             
        // Optional custom stack trace
    ){
        super(message)           
        // Calls the parent class (Error) constructor with the message
        this.statusCode = statusCode  
        // Sets the HTTP status code (e.g., 400, 500)
        this.data = null              
        // Placeholder for additional data that may be associated with the error
        this.message = message        
        // Sets the message property
        this.success = false          
        // A flag indicating failure (as opposed to success)
        this.errors = errors          
        // Stores any additional error details in an array

        // If a custom stack trace is provided, it will be used, otherwise, a default stack trace is captured
        if(stack){
            this.stack = stack      
            // Use the custom stack trace
        } else{
            Error.captureStackTrace(this, this.constructor);  
            // Capture the stack trace for the error
        }
    }
}

export default ApiError;
