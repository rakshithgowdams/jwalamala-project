import validator from "amphtml-validator";
const instance=await validator.getInstance(process.env.AMP_VALIDATOR_PATH);
const response=await fetch("http://127.0.0.1:3000/stories/heritage-story/amp");
if(!response.ok)throw Error("Story unavailable");
const result=instance.validateString(await response.text());console.log("AMP:",result.status);for(const error of result.errors)console.log(error.severity,error.code,error.message);if(result.status!=="PASS")process.exitCode=1;
