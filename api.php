
<?php
/**
 * BLOOD DONOR CONNECT - SECURE REST API
 * Place this file in your XAMPP htdocs folder (e.g., C:/xampp/htdocs/api.php)
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle Pre-flight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- DATABASE CONFIGURATION ---
$host = 'localhost'; 
$db_name = 'blood_connect';
$username = 'root'; 
$password = '';     

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
    exit();
}

// --- TABLE INITIALIZATION ---
// Added loginId and password columns
$pdo->exec("CREATE TABLE IF NOT EXISTS donors (
    id VARCHAR(50) PRIMARY KEY,
    loginId VARCHAR(50) NOT NULL,
    password VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    bloodGroup VARCHAR(5) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20),
    address TEXT,
    phone VARCHAR(20) NOT NULL,
    occupation VARCHAR(255),
    designation VARCHAR(255),
    department VARCHAR(255),
    lastDonationDate DATE,
    availability VARCHAR(20) DEFAULT 'Available',
    verificationStatus VARCHAR(20) DEFAULT 'Unverified',
    isBlocked TINYINT(1) DEFAULT 0,
    reports INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)");

$method = $_SERVER['REQUEST_METHOD'];
$path = isset($_SERVER['PATH_INFO']) ? explode('/', trim($_SERVER['PATH_INFO'], '/')) : [];

// --- API ROUTING ---

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM donors ORDER BY createdAt DESC");
    echo json_encode($stmt->fetchAll());
}

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $sql = "INSERT INTO donors (id, loginId, password, name, bloodGroup, age, gender, address, phone, occupation, designation, department, lastDonationDate, availability, verificationStatus) 
            VALUES (:id, :loginId, :password, :name, :bloodGroup, :age, :gender, :address, :phone, :occupation, :designation, :department, :lastDonationDate, :availability, :verificationStatus)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id' => $data['id'] ?? uniqid(),
        ':loginId' => $data['loginId'],
        ':password' => $data['password'],
        ':name' => $data['name'],
        ':bloodGroup' => $data['bloodGroup'],
        ':age' => $data['age'],
        ':gender' => $data['gender'],
        ':address' => $data['address'],
        ':phone' => $data['phone'],
        ':occupation' => $data['occupation'],
        ':designation' => $data['designation'],
        ':department' => $data['department'],
        ':lastDonationDate' => $data['lastDonationDate'],
        ':availability' => $data['availability'],
        ':verificationStatus' => $data['verificationStatus'] ?? 'Unverified'
    ]);
    echo json_encode(["status" => "success", "message" => "Donor registered with credentials"]);
}

if ($method === 'PATCH' && isset($path[0])) {
    $id = $path[0];
    $data = json_decode(file_get_contents("php://input"), true);
    
    $fields = [];
    $params = [':id' => $id];
    foreach ($data as $key => $value) {
        if ($key !== 'id') {
            $fields[] = "$key = :$key";
            $params[":$key"] = $value;
        }
    }
    
    $sql = "UPDATE donors SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    echo json_encode(["status" => "success", "message" => "Donor updated"]);
}

if ($method === 'DELETE' && isset($path[0])) {
    $id = $path[0];
    $stmt = $pdo->prepare("DELETE FROM donors WHERE id = :id");
    $stmt->execute([':id' => $id]);
    echo json_encode(["status" => "success", "message" => "Donor deleted"]);
}
?>
