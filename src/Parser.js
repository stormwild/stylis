import {COMMENT, RULESET, DECLARATION} from './Enum.js'
import {abs, trim, from, sizeof, strlen, substr, append, replace} from './Utility.js'
import {node, char, next, peek, caret, token, alloc, dealloc, delimit, whitespace, identifier, commenter} from './Tokenizer.js'

/**
 * @param {string} value
 * @return {object[]}
 */
export function compile (value) {
	return dealloc(parse('', null, null, [''], value = alloc(value), [0], value))
}

/**
 * @param {string} value
 * @param {object} root
 * @param {string[]} rule
 * @param {string[]} rules
 * @param {string[]} rulesets
 * @param {number[]} points
 * @param {string[]} declarations
 * @return {object}
 */
export function parse (value, root, rule, rules, rulesets, points, declarations) {
	var index = 0
	var offset = 0
	var length = 0
	var atrule = 0
	var previous = 0
	var variable = 1
	var scanning = 1
	var ampersand = 1
	var character = 0
	var type = ''
	var props = rules
	var children = rulesets
	var reference = rule
	var characters = type

	while (scanning)
		switch (previous = character, character = next()) {
			// " ' [ (
			case 34: case 39: case 91: case 40:
				characters += delimit(character)
				break
			// \t \n \s
			case 9: case 10: case 32:
				characters += whitespace(previous, strlen(characters))
				break
			// /
			case 47:
				token(peek()) > 5 ? append(comment(commenter(next(), caret()), root), declarations) : characters += '/'
				break
			// {
			case 123 * variable:
				points[index++] = strlen(characters) * ampersand
			// } ; \0
			case 125 * variable: case 59: case 0:
				switch (character) {
					// \0 }
					case 0: case 125: scanning = 0
					// ;
					case 59 + offset:
						if (length > 0)
							append(declaration(characters + ';', rule, length), declarations)
						break
					// @ ;
					case 59: characters += ';'
					// { rule/at-rule
					default:
						append(reference = ruleset(characters, root, index, offset, rules, points, type, props = [], children = [], length), rulesets)

						if (character === 123)
							if (offset === 0)
								parse(characters, root, reference, props, rulesets, points, children)
							else
								switch (atrule) {
									// - d m s
									case 45: case 100: case 109: case 115:
										parse(value, reference, rule && append(ruleset(value, reference, 0, 0, rules, points, type, rules, props = []), children), rules, children, points, rule ? props : children, length)
										break
									default:
										parse(characters, reference, reference, [''], children, points, children)
								}
				}

				index = length = offset = 0, variable = ampersand = 1, type = characters = ''
				break
			// :
			case 58:
				length = strlen(characters)
			default:
				switch (characters += from(character), character * variable) {
					// &
					case 38:
						ampersand = offset > 0 ? 1 : (characters += '\f', -1)
						break
					// @
					case 64:
						atrule = peek(), offset = strlen(type = characters += identifier(caret())), character++
						break
					// ,
					case 44:
						points[index++] = (strlen(characters) - 1) * ampersand, ampersand = 1
						break
					// -
					case 45:
						if (previous === 45)
							variable = 0
				}
		}

	return rulesets
}

/**
 * @param {string} value
 * @param {object} root
 * @param {number} index
 * @param {number} offset
 * @param {string[]} rules
 * @param {number[]} points
 * @param {string} type
 * @param {string[]} props
 * @param {string[]} children
 * @param {number} length
 * @return {object}
 */
export function ruleset (value, root, index, offset, rules, points, type, props, children, length) {
	var post = offset - 1
	var rule = offset === 0 ? rules : ['']
	var size = sizeof(rule)

	for (var i = 0, j = 0, k = 0; i < index; ++i)
		for (var x = 0, y = substr(value, post + 1, post = abs(j = points[i])), z = value; x < size; ++x)
			if (z = trim(j > 0 ? rule[x] + ' ' + y : replace(y, /&\f/g, rule[x])))
				props[k++] = z

	return node(value, root, offset === 0 ? RULESET : type, props, children, length)
}

/**
 * @param {number} value
 * @param {string[]} root
 * @param {number} type
 * @return {object}
 */
export function comment (value, root) {
	return node(value, root, COMMENT, from(char()), substr(value, 2, -2), 0)
}

/**
 * @param {string} value
 * @param {string[]} root
 * @param {number} length
 * @return {object}
 */
export function declaration (value, root, length) {
	return node(value, root, DECLARATION, substr(value, 0, length), substr(value, length + 1, -1), length)
}
