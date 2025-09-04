import styled from 'styled-components';

export const Container = styled.div.withConfig({
  shouldForwardProp: (prop) => !['padding', 'maxWidth', 'center'].includes(prop)
})`
  padding: ${props => props.padding || '40px'};
  max-width: ${props => props.maxWidth || 'none'};
  margin: ${props => props.center ? '0 auto' : '0'};
`;

export const Card = styled.div.withConfig({
  shouldForwardProp: (prop) => !['padding', 'hoverable'].includes(prop)
})`
  background: #2a2a2a;
  border-radius: 12px;
  padding: ${props => props.padding || '24px'};
  border: 1px solid #404040;
  transition: border-color 0.2s ease;
  
  &:hover {
    border-color: ${props => props.hoverable ? '#505050' : '#404040'};
  }
`;

export const Grid = styled.div.withConfig({
  shouldForwardProp: (prop) => !['columns', 'gap', 'margin'].includes(prop)
})`
  display: grid;
  grid-template-columns: ${props => props.columns || 'repeat(auto-fit, minmax(250px, 1fr))'};
  gap: ${props => props.gap || '20px'};
  margin: ${props => props.margin || '0'};
`;

export const FlexBox = styled.div.withConfig({
  shouldForwardProp: (prop) => !['direction', 'align', 'justify', 'gap', 'margin', 'wrap'].includes(prop)
})`
  display: flex;
  flex-direction: ${props => props.direction || 'row'};
  align-items: ${props => props.align || 'stretch'};
  justify-content: ${props => props.justify || 'flex-start'};
  gap: ${props => props.gap || '0'};
  margin: ${props => props.margin || '0'};
  flex-wrap: ${props => props.wrap ? 'wrap' : 'nowrap'};
`;

export const Divider = styled.hr.withConfig({
  shouldForwardProp: (prop) => prop !== 'margin'
})`
  border: none;
  height: 1px;
  background: #404040;
  margin: ${props => props.margin || '20px 0'};
`;
