import React from 'react';
import styled from 'styled-components';
import { Text } from './ui';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
  background: #1a1a1a;
`;

const Header = styled.div`
  padding: 28px 28px 12px;
  border-bottom: 1px solid #2f2f2f;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 6px 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #b0b0b0;
  margin: 0;
`;

const Content = styled.div`
  padding: 28px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;

  @media (min-width: 920px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Card = styled.div`
  background: #232323;
  border: 1px solid #333333;
  border-radius: 12px;
  padding: 20px;
`;

const CardTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 10px 0;
`;

const Link = styled.a`
  color: #7ab4ff;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const Footer = styled.div`
  padding: 10px 28px 24px;
  color: #8a8a8a;
  font-size: 12px;
`;

export default function About() {
  return (
    <Page>
      <Header>
        <Title>About myHours</Title>
        <Subtitle>Simple, focused time tracking with invoices.</Subtitle>
      </Header>
      <Content>
        <Card>
          <CardTitle>Project</CardTitle>
          <Text>
            myHours is a lightweight, privacy‑friendly time tracker built with Electron and React. It keeps your data local and helps you turn time into clean, professional invoices.
          </Text>
        </Card>

        <Card>
          <CardTitle>Author</CardTitle>
          <Text>Rob Vella</Text>
          <Text>
            GitHub: {' '}
            <Link href="https://github.com/rgr4y/myhours-timetracking" target="_blank" rel="noreferrer">
              github.com/rgr4y/myhours-timetracking
            </Link>
          </Text>
        </Card>

        <Card>
          <CardTitle>Feedback & Issues</CardTitle>
          <Text>
            Once the repository is public, please open issues on GitHub for bugs or suggestions. I review them as time permits; responses and fixes are best‑effort.
          </Text>
          <Text>
            This software is provided “as is,” without any warranty of any kind. There is no guaranteed support, and use is at your own risk.
          </Text>
        </Card>

        <Card>
          <CardTitle>License</CardTitle>
          <Text>
            GPLv3. You are free to use, study, share, and modify the software under the terms of the GNU General Public License version 3.
          </Text>
        </Card>
      </Content>
      <Footer>
        © 2025 Rob Vella
      </Footer>
    </Page>
  );
}

