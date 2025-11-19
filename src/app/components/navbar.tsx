'use client';

import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../contexts/store';
import { logout } from '../contexts/store/auth_slice';
import { toggleTheme } from '../contexts/store/theme_slice';
import { ThemeEnum } from "@/interfaces/enums.ts";

// 1. Import 'Link' จาก next/link สำหรับการนำทาง
import Link from 'next/link';

// 2. Import components จาก react-bootstrap
import { Navbar as BootstrapNavbar, Container, Button, Nav, NavDropdown } from 'react-bootstrap';

export default function Navbar() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const username = useSelector((state: RootState) => state.auth.user?.name);
  const theme = useSelector((state: RootState) => state.theme.mode);

  const navTheme = theme === ThemeEnum.DARK ? 'dark' : 'light';

  return (
    <BootstrapNavbar 
      bg={navTheme} 
      variant={navTheme} 
      expand="lg" 
      className="shadow-sm mb-4"
      sticky="top" // ทำให้ Navbar อยู่ด้านบนสุดเสมอ
    >
      <Container fluid="lg">
        {/* ทำให้ชื่อแอปเป็น Link กลับไปหน้าแรก */}
        <Link href="/" passHref legacyBehavior>
          <BootstrapNavbar.Brand>Attendance App</BootstrapNavbar.Brand>
        </Link>
        <BootstrapNavbar.Toggle aria-controls="basic-navbar-nav" />
        <BootstrapNavbar.Collapse id="basic-navbar-nav">
          {/* เมนูฝั่งซ้าย (สำหรับเมนูหลัก) */}
          <Nav className="me-auto">
            {/* <Link href="/" passHref legacyBehavior>
              <Nav.Link>Dashboard</Nav.Link>
            </Link> */}
            {/* คุณสามารถเพิ่มเมนูอื่นๆ ตรงนี้ได้ในอนาคต */}
          </Nav>
          
          {/* เมนูฝั่งขวา (สำหรับ User Controls) */}
          <Nav className="align-items-center">
            <Button 
              variant={theme === ThemeEnum.DARK ? 'outline-light' : 'outline-dark'} 
              onClick={() => dispatch(toggleTheme())} 
              className="me-3"
            >
              {theme === ThemeEnum.DARK ? '☀️' : '🌙'}
            </Button>

            {isAuthenticated ? (
              // ---- เมื่อ Login แล้ว: แสดงเป็น Dropdown ----
              <NavDropdown title={`สวัสดี  ${username}`} id="user-nav-dropdown">
                <NavDropdown.Item href="#profile" disabled>โปรไฟล์</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={() => dispatch(logout())} className="text-danger">
                  ออกจากระบบ
                </NavDropdown.Item>
              </NavDropdown>
            ) : (
              // ---- เมื่อยังไม่ Login: แสดงปุ่ม Login ที่เป็น Link ----
              <Link href="/login" passHref legacyBehavior>
                <Button as="a" variant="primary">เข้าสู่ระบบ</Button>
              </Link>
            )}
          </Nav>
        </BootstrapNavbar.Collapse>
      </Container>
    </BootstrapNavbar>
  );
}
