import styled from 'styled-components';

export const Title = styled.h1.withConfig({
  shouldForwardProp: (prop) => !['size', 'margin', 'align'].includes(prop)
})`
  color: white;
  font-size: ${props => {
    if (props.size === 'small') return '20px';
    if (props.size === 'large') return '32px';
    return '28px';
  }};
  font-weight: 600;
  margin: ${props => props.margin || '0 0 20px 0'};
  text-align: ${props => props.align || 'left'};
`;

export const Subtitle = styled.h2.withConfig({
  shouldForwardProp: (prop) => !['size', 'margin', 'align'].includes(prop)
})`
  color: white;
  font-size: ${props => {
    if (props.size === 'small') return '16px';
    if (props.size === 'large') return '24px';
    return '20px';
  }};
  font-weight: 500;
  margin: ${props => props.margin || '0 0 15px 0'};
  text-align: ${props => props.align || 'left'};
`;

export const Heading = styled.h3.withConfig({
  shouldForwardProp: (prop) => !['size', 'margin', 'align'].includes(prop)
})`
  color: white;
  font-size: ${props => {
    if (props.size === 'small') return '14px';
    if (props.size === 'large') return '20px';
    return '16px';
  }};
  font-weight: 500;
  margin: ${props => props.margin || '0 0 10px 0'};
  text-align: ${props => props.align || 'left'};
`;

export const Text = styled.p.withConfig({
  shouldForwardProp: (prop) => !['variant', 'size', 'margin', 'align', 'weight'].includes(prop)
})`
  color: ${props => {
    if (props.variant === 'secondary') return '#999';
    if (props.variant === 'success') return '#34C759';
    if (props.variant === 'danger') return '#FF3B30';
    if (props.variant === 'warning') return '#FF9500';
    return '#ccc';
  }};
  font-size: ${props => {
    if (props.size === 'small') return '12px';
    if (props.size === 'large') return '16px';
    return '14px';
  }};
  margin: ${props => props.margin || '0'};
  text-align: ${props => props.align || 'left'};
  font-weight: ${props => props.weight || 'normal'};
`;

export const BigNumber = styled.div.withConfig({
  shouldForwardProp: (prop) => !['size', 'margin'].includes(prop)
})`
  color: white;
  font-size: ${props => props.size || '48px'};
  font-weight: 700;
  line-height: 1;
  margin: ${props => props.margin || '0'};
`;
