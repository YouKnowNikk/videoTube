class ApiError extends Error{
    constructor(
        statusCode,
        message="Something Went Wrong",
        Errors = [],
        stack = ""        

    ){
        super(message)
        this.statusCode=statusCode;
        this.Errors=Errors,
        this.data = null,
        this.message = message,
        this.success = false

        if(stack){
            this.stack = stack
       }
       else{
        Error.captureStackTrace(this , this.constructor)
       }
    }
}

export {ApiError}