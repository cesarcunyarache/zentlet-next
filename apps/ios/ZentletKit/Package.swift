// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "ZentletKit",
    defaultLocalization: "en",
    platforms: [.iOS(.v18), .macOS(.v15)],
    products: [
        .library(name: "ZentletCore", targets: ["ZentletCore"]),
        .library(name: "ZentletData", targets: ["ZentletData"]),
    ],
    targets: [
        // Domain models, business rules, repository contracts and ViewModels. Never imports SwiftData or URLSession.
        .target(name: "ZentletCore"),
        // Infrastructure: SwiftData (local), URLSession (remote), Keychain and the dependency container.
        .target(name: "ZentletData", dependencies: ["ZentletCore"]),
        .testTarget(name: "ZentletCoreTests", dependencies: ["ZentletCore"]),
        .testTarget(name: "ZentletDataTests", dependencies: ["ZentletCore", "ZentletData"]),
    ]
)
