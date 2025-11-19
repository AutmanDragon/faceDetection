"use client";

import { Col, Container, Row, Alert, Card, Form, InputGroup, Spinner, Badge, Button } from "react-bootstrap";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Search, FileEarmarkSpreadsheetFill } from "react-bootstrap-icons";
import Papa from 'papaparse';

// --- Interfaces ---
interface AttendanceLog {
    attendee_id: string;
    datetime: string;
    timestamp: number;
    first_name?: string;
    last_name?: string;
}
interface Student {
    student_id: string;
    first_name: string;
    last_name: string;
}

// --- Helper Function ---
const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// ====================================================================
// --- Main Component ---
// ====================================================================
export default function AttendanceLogs() {
    const [allAttendances, setAllAttendances] = useState<AttendanceLog[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>("");

    const [selectedDate, setSelectedDate] = useState(formatDateToYYYYMMDD(new Date()));
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [attendancesResponse, studentsResponse] = await Promise.all([
                    axios.get("http://localhost:8000/attendances/details/"),
                    axios.get("http://localhost:8000/students/")
                ]);
                setAllAttendances(attendancesResponse.data);
                setAllStudents(studentsResponse.data);
            } catch (error) {
                console.error("Error fetching data:", error);
                setError("ไม่สามารถโหลดข้อมูลได้");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- vvv LOGIC ใหม่ทั้งหมดสำหรับแสดงผล vvv ---
    type Status = 'on-time' | 'late' | 'absent' | 'out-of-hours';

    const displayData = useMemo(() => {
        const classDate = new Date(selectedDate);
        const startClassTime = new Date(new Date(classDate).setHours(13, 0, 0, 0));
        const onTimeCutoff = new Date(new Date(classDate).setHours(13, 30, 0, 0));
        const endClassTime = new Date(new Date(classDate).setHours(16, 0, 0, 0));

        const getStatusForPresent = (datetime: string): Status | null => {
            const attendanceTime = new Date(datetime); 
            if (attendanceTime.getTime() >= startClassTime.getTime() && attendanceTime.getTime() < onTimeCutoff.getTime()) return 'on-time';
            if (attendanceTime.getTime() >= onTimeCutoff.getTime() && attendanceTime.getTime() <= endClassTime.getTime()) return 'late';
            return 'out-of-hours';
        };
        
        const attendedLogsOnSelectedDate = allAttendances.filter(log => {
            if (!log.datetime) return false;
            return formatDateToYYYYMMDD(new Date(log.datetime)) === selectedDate;
        });

        const presentStudentsMap = new Map<string, { status: Status, log: AttendanceLog }>();
        
        for (const log of attendedLogsOnSelectedDate) {
            const status = getStatusForPresent(log.datetime);
            if (status === 'on-time' || status === 'late') {
                if (!presentStudentsMap.has(log.attendee_id)) {
                    presentStudentsMap.set(log.attendee_id, { status: status, log: log });
                }
            }
        }

        const combinedData = allStudents.map(student => {
            const presentData = presentStudentsMap.get(student.student_id);
            if (presentData) {
                return {
                    ...student,
                    datetime: presentData.log.datetime,
                    timestamp: presentData.log.timestamp,
                    status: presentData.status
                };
            } else {
                return {
                    ...student,
                    datetime: null,
                    timestamp: Math.random(),
                    status: 'absent' as const
                };
            }
        });

        // กรองข้อมูลทั้งหมดในขั้นตอนเดียว (รวม Search)
        return combinedData.filter(item => {
            const statusMatch = statusFilter === 'all' || item.status === statusFilter;
            const nameMatch = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
            return statusMatch && nameMatch;
        });
    }, [allAttendances, allStudents, selectedDate, statusFilter, searchQuery]);
    // --- ^^^ สิ้นสุด LOGIC ใหม่ ^^^ ---

    // 3. สร้างฟังก์ชันสำหรับ Export
    const handleExport = () => {
        const dataForCsv = displayData.map(item => {
            let statusText: string = item.status;
            if (item.status === 'on-time') statusText = 'ตรงเวลา';
            if (item.status === 'late') statusText = 'สาย';
            if (item.status === 'absent') statusText = 'ขาด';
            if (item.status === 'out-of-hours') statusText = 'นอกเวลาเรียน';

            return {
                "รหัสนักศึกษา": item.student_id,
                "ชื่อ": item.first_name,
                "นามสกุล": item.last_name,
                "เวลาที่เช็คชื่อ": item.datetime ? new Date(item.datetime).toLocaleTimeString("th-TH", { timeZone: 'Asia/Bangkok' }) : '---',
                "สถานะ": statusText
            };
        });

        const csv = Papa.unparse(dataForCsv);

        // --- vvv จุดที่แก้ไขสำคัญที่สุด vvv ---
        // เพิ่ม \uFEFF (BOM) เข้าไปที่จุดเริ่มต้นของไฟล์
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        // --- ^^^ สิ้นสุดจุดแก้ไข ^^^ ---

        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `report-attendance-${selectedDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderContent = () => {
        if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;
        if (error) return <Alert variant="danger">{error}</Alert>;
        if (displayData.length === 0) return <Alert variant="info">ไม่พบบันทึกสำหรับเงื่อนไขที่เลือก</Alert>;
        
        return (
            <div className="table-responsive">
                <table className="table table-striped table-hover">
                    <thead>
                        <tr>
                            <th>เวลา</th>
                            <th>ชื่อ - สกุล</th>
                            <th>สถานะ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.map((item) => {
                            const { status, datetime, first_name, last_name, student_id, timestamp } = item;
                            return (
                                <tr key={`${student_id}-${timestamp}`}> 
                                    <td>{datetime ? new Date(datetime).toLocaleTimeString("th-TH", { timeZone: 'Asia/Bangkok' }) : '---'}</td>
                                    <td>{first_name} {last_name}</td>
                                    <td>
                                        {status === 'on-time' && <Badge bg="success">ตรงเวลา</Badge>}
                                        {status === 'late' && <Badge bg="warning">เข้าสาย</Badge>}
                                        {status === 'absent' && <Badge bg="danger">ขาด</Badge>}
                                        {status === 'out-of-hours' && <Badge bg="dark">นอกเวลาเรียน</Badge>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <Container fluid="lg" className="py-4">
            <Row className="mb-4 align-items-center">
                <Col><h2 className="fw-bold">บันทึกการเข้าเรียน</h2></Col>
                <Col xs="auto">
                    <Button variant="outline-success" onClick={handleExport} disabled={loading || displayData.length === 0}>
                        <FileEarmarkSpreadsheetFill className="me-2" />
                        Export CSV
                    </Button>
                </Col>
            </Row>

            <Card className="shadow-sm">
                <Card.Header className="p-3">
                    <Row className="g-2 align-items-end">
                        <Col md>
                            <Form.Group controlId="datePicker">
                                <Form.Label>เลือกวันที่</Form.Label>
                                <Form.Control type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="date-picker"/>
                            </Form.Group>
                        </Col>
                        <Col md>
                            <Form.Group controlId="statusFilter">
                                <Form.Label>สถานะ</Form.Label>
                                <Form.Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                    <option value="all">ทั้งหมด</option>
                                    <option value="on-time">ตรงเวลา</option>
                                    <option value="late">เข้าสาย</option>
                                    <option value="absent">ขาด</option>
                                    <option value="out-of-hours">นอกเวลาเรียน</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={5}>
                            <Form.Group controlId="searchFilter">
                               <Form.Label>ค้นหาชื่อ</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text><Search /></InputGroup.Text>
                                    <Form.Control placeholder="พิมพ์ชื่อหรือนามสกุล..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </InputGroup>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body className="p-0">{renderContent()}</Card.Body>
            </Card>
        </Container>
    );
}