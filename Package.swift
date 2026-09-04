// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorKhipu",
    platforms: [.iOS(.v14)],
    products: [
        .library(name: "CapacitorKhipu", targets: ["KhipuPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.0.0"),
        .package(url: "https://github.com/khipu/KhipuClientIOS.git", exact: "2.16.5")
    ],
    targets: [
        .target(
            name: "KhipuPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "KhipuClientIOS", package: "KhipuClientIOS")
            ],
            path: "ios/Sources/KhipuPlugin"),
        .testTarget(
            name: "KhipuPluginTests",
            dependencies: [
                "KhipuPlugin",
                .product(name: "Capacitor", package: "capacitor-swift-pm")
            ],
            path: "ios/Tests/KhipuPluginTests")
    ]
)
