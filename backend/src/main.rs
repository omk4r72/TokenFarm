use actix_files::Files;
use actix_web::{post, web, App, HttpServer};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Deserialize)]
struct BuildRequest {
    action: String,
    amount: String,
    pool_id: String,
    sender: String,
}

#[derive(Serialize)]
struct BuildResponse {
    unsigned_xdr: String,
    network_passphrase: String,
}

#[derive(Deserialize)]
struct SubmitRequest {
    signed_xdr: String,
}

#[derive(Serialize)]
struct SubmitResponse {
    ok: bool,
    hash: String,
}

/// Build unsigned XDR (demo placeholder)
#[post("/build-unsigned")]
async fn build_unsigned(req: web::Json<BuildRequest>) -> web::Json<BuildResponse> {
    let network_passphrase =
        env::var("NETWORK_PASSPHRASE").unwrap_or_else(|_| "Test SDF Network ; September 2015".into());

    // Demo unsigned XDR string
    let unsigned_xdr = format!(
        "DEMO_UNSIGNED_XDR|{}|{}|{}|FROM|{}",
        req.action, req.amount, req.pool_id, req.sender
    );

    web::Json(BuildResponse { unsigned_xdr, network_passphrase })
}

/// Submit signed XDR (demo placeholder)
#[post("/submit-signed")]
async fn submit_signed(req: web::Json<SubmitRequest>) -> web::Json<SubmitResponse> {
    if req.signed_xdr.starts_with("DEMO_UNSIGNED_XDR|") {
        web::Json(SubmitResponse {
            ok: true,
            hash: "DEMO_TX_HASH_12345".into(),
        })
    } else {
        web::Json(SubmitResponse {
            ok: false,
            hash: "Invalid demo XDR".into(),
        })
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    let port = env::var("PORT").unwrap_or_else(|_| "8081".into());

    println!("Backend running on http://localhost:{}", port);

    HttpServer::new(|| {
        App::new()
            // Serve frontend static files
            .service(Files::new("/", "./frontend").index_file("index.html"))
            // API endpoints
            .service(build_unsigned)
            .service(submit_signed)
    })
    .bind(format!("0.0.0.0:{}", port))?
    .run()
    .await
}
