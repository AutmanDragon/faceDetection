'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image';
import Link from 'next/link';

import "bootstrap/dist/css/bootstrap.min.css";
// Import components เพิ่มเติม
import { Container, Row, Col, Form, Button, Alert, Card, InputGroup, Spinner } from 'react-bootstrap'

import { useSelector } from 'react-redux'
import { RootState } from '../contexts/store'
import { ThemeEnum } from '@/interfaces/enums'
import axios, { isAxiosError } from 'axios';

// Import Icons (ต้องแน่ใจว่าได้ npm install react-bootstrap-icons แล้ว)
import { PersonPlusFill, EnvelopeFill, PersonFill, LockFill, EyeFill, EyeSlashFill, CheckCircleFill } from 'react-bootstrap-icons';

export default function RegisterPage() {
    const router = useRouter();
    const theme = useSelector((state: RootState) => state.theme.mode);
    
    // Form Data State
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '' // เพิ่ม state ยืนยันรหัสผ่าน
    });
    const [imageFile, setImageFile] = useState<File | null>(null);

    // UI State
    const [error, setError] = useState('');
    const [imagePreview, setImagePreview] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false); // State สำหรับแสดงหน้า Success

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const fileType = file.type;
            if (!['image/jpeg', 'image/png', 'image/jpg'].includes(fileType)) {
                setError('กรุณาอัปโหลดไฟล์ .jpg หรือ .png เท่านั้น');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            setImageFile(file);
            setError('');
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (!formData.email.endsWith('@kmitl.ac.th')) {
            setError('กรุณาใช้อีเมลสถาบัน (@kmitl.ac.th) เท่านั้น');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
            return;
        }
        if (!imageFile) {
            setError('กรุณาอัปโหลดรูปภาพประจำตัว');
            return;
        }

        setLoading(true);
        const formDataToSend = new FormData();
        formDataToSend.append('email', formData.email);
        formDataToSend.append('first_name', formData.firstName);
        formDataToSend.append('last_name', formData.lastName);
        formDataToSend.append('password', formData.password);
        formDataToSend.append('image', imageFile);

        try {
            const response = await axios.post("http://localhost:8000/register", formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.status === 200) {
                setIsSuccess(true); // แสดงหน้า Success
            }
        } catch (error) {
            console.error('Registration error:', error);
            if (isAxiosError(error)) {
                setError(error.response?.data.detail || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
            } else {
                setError('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
            }
        } finally {
            setLoading(false);
        }
    };

    // --- ส่วนแสดงผลเมื่อสมัครสำเร็จ ---
    if (isSuccess) {
        return (
            <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
                <Row className="w-100 justify-content-center">
                    <Col md={6} lg={4}>
                        <Card className="shadow-lg border-0 text-center p-4">
                            <Card.Body>
                                <CheckCircleFill size={60} className="text-success mb-3" />
                                <h2 className="fw-bold">สมัครสมาชิกสำเร็จ!</h2>
                                <p className="text-muted">
                                    บัญชีของคุณถูกสร้างเรียบร้อยแล้ว กรุณาเข้าสู่ระบบเพื่อใช้งาน
                                </p>
                                <Button variant="primary" size="lg" onClick={() => router.push('/login')}>
                                    ไปที่หน้าเข้าสู่ระบบ
                                </Button>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        );
    }
    
    // --- ส่วนแสดงผลฟอร์มสมัครสมาชิก ---
    return (
        <Container className="d-flex align-items-center justify-content-center py-5">
            <Row className="w-100 justify-content-center">
                <Col md={8} lg={6} xl={5}>
                    <Card className="shadow-lg border-0">
                        <Card.Body className="p-4 p-sm-5">
                            <div className="text-center mb-4">
                                <PersonPlusFill size={40} className="mb-2" />
                                <h2 className="fw-bold">สร้างบัญชีผู้ใช้ใหม่</h2>
                                <p className="text-muted">กรอกข้อมูลคั้บอ้วนน</p>
                            </div>
                            
                            {error && <Alert variant="danger">{error}</Alert>}

                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-4 text-center">
                                    <Form.Label htmlFor="image-upload" style={{ cursor: 'pointer' }}>
                                        {imagePreview ? (
                                            <Image src={imagePreview} alt="Preview" width={120} height={120} className="rounded-circle object-fit-cover" />
                                        ) : (
                                            <div className="d-flex justify-content-center align-items-center bg-secondary rounded-circle text-white" style={{ width: 120, height: 120 }}>
                                                <span>อัปโหลดรูป</span>
                                            </div>
                                        )}
                                    </Form.Label>
                                    <Form.Control id="image-upload" type="file" accept=".jpg,.jpeg,.png" onChange={handleImageChange} className="d-none" required/>
                                </Form.Group>
                                
                                <Row>
                                    <Col sm={6}><Form.Group className="mb-3"><Form.Label>ชื่อ</Form.Label><InputGroup><InputGroup.Text><PersonFill /></InputGroup.Text><Form.Control type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="สมชาย" required /></InputGroup></Form.Group></Col>
                                    <Col sm={6}><Form.Group className="mb-3"><Form.Label>นามสกุล</Form.Label><InputGroup><InputGroup.Text><PersonFill /></InputGroup.Text><Form.Control type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="ใจดี" required /></InputGroup></Form.Group></Col>
                                </Row>

                                <Form.Group className="mb-3"><Form.Label>อีเมลสถาบัน</Form.Label><InputGroup><InputGroup.Text><EnvelopeFill /></InputGroup.Text><Form.Control type="email" name="email" value={formData.email} onChange={handleChange} placeholder="example@kmitl.ac.th" required /></InputGroup></Form.Group>
                                <Form.Group className="mb-3"><Form.Label>รหัสผ่าน</Form.Label><InputGroup><InputGroup.Text><LockFill /></InputGroup.Text><Form.Control type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} placeholder="กรอกรหัสผ่าน" required /><Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeSlashFill /> : <EyeFill />}</Button></InputGroup></Form.Group>
                                <Form.Group className="mb-4"><Form.Label>ยืนยันรหัสผ่าน</Form.Label><InputGroup><InputGroup.Text><LockFill /></InputGroup.Text><Form.Control type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="กรอกรหัสผ่านอีกครั้ง" required /><Button variant="outline-secondary" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeSlashFill /> : <EyeFill />}</Button></InputGroup></Form.Group>

                                <Button variant="primary" type="submit" className="w-100" size="lg" disabled={loading}>
                                    {loading ? <Spinner as="span" animation="border" size="sm" /> : 'สมัครสมาชิก'}
                                </Button>
                            </Form>

                             <div className="text-center mt-4">
                                <span className="text-muted">มีบัญชีอยู่แล้ว? </span>
                                <Link href="/login">เข้าสู่ระบบที่นี่</Link>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    )
}

