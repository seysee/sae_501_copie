function Button({ label, onClick, className, disabled }) {
    return (
        <button
            onClick={onClick}
            className={`w-full py-2 px-4 rounded-lg border-4 text-center font-Amatic text-2xl ${className}`}
            type="button"
            disabled={disabled}
        >
            {label}
        </button>
    );
}

export default Button;
