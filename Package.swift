// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorKhipu",
    platforms: [.iOS(.v13)],
    products: [
        .library(
            name: "CapacitorKhipu",
            targets: ["KhipuPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", branch: "main")
    ],
    targets: [
        .target(
            name: "KhipuPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/KhipuPlugin"),
        .testTarget(
            name: "KhipuPluginTests",
            dependencies: ["KhipuPlugin"],
            path: "ios/Tests/KhipuPluginTests")
    ]
)