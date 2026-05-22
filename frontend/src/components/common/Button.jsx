import './Button.css';

function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <button className={`cw-button cw-button--${variant} cw-button--${size} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export default Button;
 
