use wasm_bindgen::prelude::*;
use meval::eval_str;

#[wasm_bindgen]
pub fn calculate(expr: &str) -> Result<f64, JsValue> {
    match eval_str(expr) {
        Ok(result) => Ok(result),
        Err(err) => Err(JsValue::from_str(&format!("Error: {}", err))),
    }
}
