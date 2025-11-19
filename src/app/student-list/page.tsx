"use client";

// Import ที่จำเป็น
import { Col, Container, Row, Alert, Card, Form, InputGroup, Spinner, Button, Modal } from "react-bootstrap";
import { useEffect, useState, useMemo } from "react";
import axios, { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
// --- vvv แก้ไข Path Import ให้ถูกต้อง vvv ---
import { RootState } from "@/app/contexts/store";
// --- ^^^ สิ้นสุดการแก้ไข ^^^ ---
import {  Search, PencilSquare, Trash3Fill } from "react-bootstrap-icons";

// --- Interfaces ---
interface Student {
    student_id: string;
    first_name: string;
    last_name: string;
}

// ====================================================================
// --- Main Component ---
// ====================================================================
export default function StudentList() {
    const router = useRouter();
    const auth = useSelector((state: RootState) => state.auth);
    const isTeacher = auth.user?.isTeacher || false; // ตรวจสอบสิทธิ์

    // State จัดการข้อมูล
    const [students, setStudents] = useState<Student[]>([]); // เริ่มต้นด้วย Array ว่าง
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // State สำหรับ UI
    const [searchQuery, setSearchQuery] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    // const [showAddModal, setShowAddModal] = useState(false); // (ปิดฟังก์ชัน Add ชั่วคราว)
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    // const [newStudent, setNewStudent] = useState({ student_id: '', first_name: '', last_name: '' });

    // --- Data Fetching & Auth Check ---
    useEffect(() => {
        if (!auth.isAuthenticated) {
            router.push("/login");
            return;
        }

        const fetchStudents = async () => {
            try {
                const response = await axios.get("http://localhost:8000/students/");
                setStudents(response.data);
            } catch (error) {
                console.error("Error fetching students:", error);
                setError("ไม่สามารถโหลดข้อมูลนักเรียนได้");
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, [auth.isAuthenticated, router]);
    
    // --- Search Logic ---
    const filteredStudents = useMemo(() => {
        if (!searchQuery) return students;
        return students.filter(student => 
            student.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.student_id.includes(searchQuery)
        );
    }, [students, searchQuery]);

    // --- Handlers for Modals ---
    const handleShowDeleteModal = (student: Student) => {
        if (!isTeacher) return; // ถ้าไม่ใช่ครู, ไม่ทำอะไรเลย
        setSelectedStudent(student);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!selectedStudent) return;
        try {
            await axios.delete(`http://localhost:8000/students/${selectedStudent.student_id}`);
            setStudents(prev => prev.filter(s => s.student_id !== selectedStudent.student_id));
            setShowDeleteModal(false);
            setSelectedStudent(null);
        } catch (err) {
            console.error("Error deleting student:", err);
            let errorMsg = "เกิดข้อผิดพลาดในการลบข้อมูล";
            if (isAxiosError(err) && err.response?.data?.detail) {
                errorMsg = err.response.data.detail;
            }
            // ใช้วิธี setError แทน alert
            setError(errorMsg); 
            setShowDeleteModal(false);
        }
    };
    
    // (ปิดฟังก์ชัน Add ชั่วคราว เนื่องจากควรทำผ่านหน้า Register)
    // const handleShowAddModal = () => { ... };
    // const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => { ... };

    if (!auth.isAuthenticated) return null; // แสดงหน้าว่างขณะ redirect

    const renderContent = () => {
        if (loading) {
            return <div className="text-center p-5"><Spinner animation="border" /></div>;
        }
        // แก้ไข Error Alert ให้แสดงผลในตาราง
        if (error) {
            return <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>;
        }
        if (filteredStudents.length === 0) {
            return <Alert variant="info">ไม่พบข้อมูลนักเรียน{searchQuery && "ที่ตรงกับการค้นหา"}</Alert>;
        }
        return (
            <div className="table-responsive">
                <table className="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>รหัสนักเรียน</th>
                            <th>ชื่อ</th>
                            <th>นามสกุล</th>
                            <th className="text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student) => (
                            <tr key={student.student_id}>
                                <td>{student.student_id}</td>
                                <td>{student.first_name}</td>
                                <td>{student.last_name}</td>
                                <td className="text-center">
                                    <Button variant="outline-warning" size="sm" className="me-2" disabled>
                                        <PencilSquare />
                                    </Button>
                                    <Button variant="outline-danger" size="sm" onClick={() => handleShowDeleteModal(student)} disabled={!isTeacher}>
                                        <Trash3Fill />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <>
            <Container fluid="lg" className="py-4">
                {/* --- Header --- */}
                <Row className="mb-4 align-items-center">
                    <Col>
                        <h2 className="fw-bold mb-0">จัดการรายชื่อนักเรียน</h2>
                    </Col>
                    <Col xs="auto">
                        {/* ปิดปุ่ม Add ชั่วคราว */}
                        {/* <Button variant="primary" onClick={handleShowAddModal} disabled={!isTeacher}>
                            <PersonPlusFill className="me-2" />
                            เพิ่มนักเรียน (ชั่วคราว)
                        </Button> */}
                    </Col>
                </Row>

                {/* --- Content Card --- */}
                <Card className="shadow-sm">
                    <Card.Header className="p-3">
                        <Form.Group controlId="searchFilter">
                           <Form.Label>ค้นหาชื่อ หรือ รหัสนักเรียน</Form.Label>
                            <InputGroup>
                                <InputGroup.Text><Search /></InputGroup.Text>
                                <Form.Control 
                                    placeholder="ค้นหา..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </InputGroup>
                        </Form.Group>
                    </Card.Header>
                    <Card.Body className="p-0">
                       {renderContent()}
                    </Card.Body>
                </Card>
            </Container>

            {/* --- Modals --- */}
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>ยืนยันการลบ</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    คุณต้องการลบรายชื่อของ **{selectedStudent?.first_name} {selectedStudent?.last_name}** ใช่หรือไม่?
                    <br />
                    <strong className="text-danger">คำเตือน:</strong> การกระทำนี้จะลบบัญชีผู้ใช้และข้อมูลทั้งหมดของนักเรียนคนนี้ออกจากระบบอย่างถาวร
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>ยกเลิก</Button>
                    <Button variant="danger" onClick={handleConfirmDelete}>ยืนยันการลบ</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}